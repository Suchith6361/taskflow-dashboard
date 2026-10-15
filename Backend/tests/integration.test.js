import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createPool } from "../src/config/db.js";
import { getConfig } from "../src/config/env.js";
import { runMigrations } from "../src/config/migrate.js";

const enabled = Boolean(process.env.TEST_DB_NAME);
let pool;
let app;

if (enabled) {
  before(async () => {
    const config = getConfig({ forTests: true });
    pool = createPool(config.db);
    await pool.execute("SELECT 1");
    await runMigrations(pool);
    app = createApp({ pool, config, logger: { info() {}, error() {} }, authLimit: 1000 });
  });

  after(async () => {
    await pool?.end();
  });
}

async function createAccount(prefix) {
  const email = `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
  const response = await request(app).post("/api/auth/register").send({
    name: "Test User",
    email,
    password: "TestPassword123",
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  return { email, token: response.body.data.token, user: response.body.data.user };
}

async function createProject(token, name = "Test Project") {
  const response = await request(app).post("/api/projects").set("Authorization", `Bearer ${token}`).send({ name, description: null });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  return response.body.data.project;
}

async function deleteFixtureUser(userId) {
  if (userId) await pool.execute("DELETE FROM users WHERE id = ?", [userId]);
}

test("integration: health confirms a real MySQL connection", { skip: !enabled }, async () => {
  const response = await request(app).get("/api/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.data.database, "connected");
});

test("integration: registration hashes passwords, login succeeds/fails, and /me reads token identity", { skip: !enabled }, async () => {
  let userId;
  try {
    const account = await createAccount("auth");
    userId = account.user.id;
    const [rows] = await pool.execute("SELECT password_hash FROM users WHERE id = ?", [userId]);
    assert.notEqual(rows[0].password_hash, "TestPassword123");
    assert.equal(await bcrypt.compare("TestPassword123", rows[0].password_hash), true);

    const login = await request(app).post("/api/auth/login").send({ email: account.email.toUpperCase(), password: "TestPassword123" });
    assert.equal(login.status, 200);
    assert.equal(login.body.data.user.id, userId);
    const failedLogin = await request(app).post("/api/auth/login").send({ email: account.email, password: "incorrect-password" });
    assert.equal(failedLogin.status, 401);

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${account.token}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.data.user.email, account.email);
    assert.equal(me.body.data.user.password_hash, undefined);
    assert.equal((await request(app).get("/api/auth/me")).status, 401);
  } finally {
    await deleteFixtureUser(userId);
  }
});

test("integration: project CRUD, aggregate progress, ownership, and cascade deletion", { skip: !enabled }, async () => {
  let userId;
  let otherUserId;
  try {
    const owner = await createAccount("project-owner");
    const other = await createAccount("project-other");
    userId = owner.user.id;
    otherUserId = other.user.id;
    const project = await createProject(owner.token);

    const otherRead = await request(app).get(`/api/projects/${project.id}`).set("Authorization", `Bearer ${other.token}`);
    assert.equal(otherRead.status, 404);
    assert.equal((await request(app).get("/api/projects").set("Authorization", `Bearer ${other.token}`)).body.data.length, 0);

    for (const status of ["todo", "done"]) {
      const createdTask = await request(app).post("/api/tasks").set("Authorization", `Bearer ${owner.token}`).send({
        projectId: project.id, title: `Progress ${status}`, status, priority: "medium", dueDate: null,
      });
      assert.equal(createdTask.status, 201);
    }
    const detail = await request(app).get(`/api/projects/${project.id}`).set("Authorization", `Bearer ${owner.token}`);
    assert.equal(Number(detail.body.data.project.taskCount), 2);
    assert.equal(Number(detail.body.data.project.progress), 50);

    const updated = await request(app).put(`/api/projects/${project.id}`).set("Authorization", `Bearer ${owner.token}`).send({ name: "Renamed Project", description: "Updated" });
    assert.equal(updated.body.data.project.name, "Renamed Project");
    assert.equal((await request(app).put(`/api/projects/${project.id}`).set("Authorization", `Bearer ${owner.token}`).send({ name: "Renamed Project", description: "Updated" })).status, 200);
    assert.equal((await request(app).put(`/api/projects/${project.id}`).set("Authorization", `Bearer ${other.token}`).send({ name: "Taken", description: null })).status, 404);

    const deleted = await request(app).delete(`/api/projects/${project.id}`).set("Authorization", `Bearer ${owner.token}`);
    assert.equal(deleted.status, 200);
    assert.equal((await request(app).get(`/api/projects/${project.id}`).set("Authorization", `Bearer ${owner.token}`)).status, 404);
    const [remainingTasks] = await pool.execute("SELECT id FROM tasks WHERE project_id = ?", [project.id]);
    assert.equal(remainingTasks.length, 0);
  } finally {
    await deleteFixtureUser(userId);
    await deleteFixtureUser(otherUserId);
  }
});

test("integration: task CRUD, ownership, validation, search/filter combinations, pagination, and dashboard stats", { skip: !enabled }, async () => {
  let userId;
  let otherUserId;
  try {
    const owner = await createAccount("task-owner");
    const other = await createAccount("task-other");
    userId = owner.user.id;
    otherUserId = other.user.id;
    const project = await createProject(owner.token, "Tasks Project");
    const otherProject = await createProject(other.token, "Other Project");

    const makeTask = (input) => request(app).post("/api/tasks").set("Authorization", `Bearer ${owner.token}`).send({
      projectId: project.id, title: "Routine task", description: null, status: "todo", priority: "low", dueDate: null, ...input,
    });
    const today = new Date();
    today.setDate(today.getDate() - 1);
    const yesterday = today.toISOString().slice(0, 10);
    const first = await makeTask({ title: "Urgent overdue work", priority: "high", dueDate: yesterday });
    const second = await makeTask({ title: "Urgent completed work", status: "done", priority: "high" });
    const third = await makeTask({ title: "Ordinary work", priority: "low" });
    for (const created of [first, second, third]) assert.equal(created.status, 201, JSON.stringify(created.body));

    const ownTask = first.body.data.task;
    assert.equal((await request(app).get(`/api/tasks/${ownTask.id}`).set("Authorization", `Bearer ${other.token}`)).status, 404);
    assert.equal((await request(app).post("/api/tasks").set("Authorization", `Bearer ${owner.token}`).send({ projectId: otherProject.id, title: "Wrong project" })).status, 404);
    assert.equal((await makeTask({ status: "blocked" })).status, 400);
    assert.equal((await makeTask({ priority: "urgent" })).status, 400);
    assert.equal((await request(app).patch(`/api/tasks/${ownTask.id}/status`).set("Authorization", `Bearer ${owner.token}`).send({ status: "blocked" })).status, 400);

    const filtered = await request(app).get("/api/tasks?search=Urgent&status=todo&priority=high&page=1&pageSize=1").set("Authorization", `Bearer ${owner.token}`);
    assert.equal(filtered.status, 200);
    assert.deepEqual(filtered.body.data.map((task) => task.title), ["Urgent overdue work"]);
    assert.deepEqual(filtered.body.meta.pagination, { page: 1, pageSize: 1, total: 1, totalPages: 1 });
    assert.equal((await request(app).get("/api/tasks?status=nope").set("Authorization", `Bearer ${owner.token}`)).status, 400);
    assert.equal((await request(app).get("/api/tasks?pageSize=1000").set("Authorization", `Bearer ${owner.token}`)).status, 400);

    const taskId = ownTask.id;
    const updated = await request(app).put(`/api/tasks/${taskId}`).set("Authorization", `Bearer ${owner.token}`).send({
      projectId: project.id, title: "Updated work", description: "Updated text", status: "in_progress", priority: "medium", dueDate: null,
    });
    assert.equal(updated.body.data.task.title, "Updated work");
    assert.equal((await request(app).put(`/api/tasks/${taskId}`).set("Authorization", `Bearer ${owner.token}`).send({
      projectId: project.id, title: "Updated work", description: "Updated text", status: "in_progress", priority: "medium", dueDate: null,
    })).status, 200);
    const statusUpdate = await request(app).patch(`/api/tasks/${taskId}/status`).set("Authorization", `Bearer ${owner.token}`).send({ status: "done" });
    assert.equal(statusUpdate.body.data.task.status, "done");
    assert.equal((await request(app).patch(`/api/tasks/${taskId}/status`).set("Authorization", `Bearer ${owner.token}`).send({ status: "done" })).status, 200);
    assert.equal((await request(app).delete(`/api/tasks/${taskId}`).set("Authorization", `Bearer ${other.token}`)).status, 404);
    assert.equal((await request(app).delete(`/api/tasks/${taskId}`).set("Authorization", `Bearer ${owner.token}`)).status, 200);

    const stats = await request(app).get("/api/dashboard/stats").set("Authorization", `Bearer ${owner.token}`);
    assert.equal(stats.status, 200);
    const dashboard = stats.body.data.stats;
    assert.deepEqual({ totalProjects: dashboard.totalProjects, totalTasks: dashboard.totalTasks, completedTasks: dashboard.completedTasks, overdueTasks: dashboard.overdueTasks }, { totalProjects: 1, totalTasks: 2, completedTasks: 1, overdueTasks: 0 });
    assert.deepEqual(dashboard.byStatus, { todo: 1, in_progress: 0, done: 1 });
    assert.equal(dashboard.recentProjects.length, 1);
    assert.equal(dashboard.recentProjects[0].name, "Tasks Project");
    assert.equal(Number(dashboard.recentProjects[0].taskCount), 2);
    assert.equal(Number(dashboard.recentProjects[0].completedTaskCount), 1);
    assert.equal(Number(dashboard.recentProjects[0].progress), 50);
  } finally {
    await deleteFixtureUser(userId);
    await deleteFixtureUser(otherUserId);
  }
});
