import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { createApp } from "../src/app.js";
import { getConfig, getDatabaseConfig } from "../src/config/env.js";
import { runMigrations, safeMigrationErrorMessage } from "../src/config/migrate.js";
import { parse } from "../src/utils/validation.js";
import { registerSchema, taskFiltersSchema } from "../src/validators/schemas.js";
import { createDashboardService } from "../src/services/dashboardService.js";

const config = {
  jwtSecret: "test-secret-that-is-long-enough-for-unit-testing-only",
  clientUrl: "http://localhost:3000",
  nodeEnv: "test",
};
const silentLogger = { info() {}, error() {} };

test("health reports a working database and gives a safe unavailable response", async () => {
  const connectedApp = createApp({ pool: { execute: async () => [[{ 1: 1 }]] }, config, logger: silentLogger });
  const connected = await request(connectedApp).get("/api/health");
  assert.equal(connected.status, 200);
  assert.deepEqual(connected.body.data, { status: "ok", database: "connected" });

  const unavailableApp = createApp({
    pool: { execute: async () => { throw Object.assign(new Error("private database details"), { code: "ECONNREFUSED" }); } },
    config,
    logger: silentLogger,
  });
  const unavailable = await request(unavailableApp).get("/api/health");
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.body.error.code, "DATABASE_UNAVAILABLE");
  assert.equal(JSON.stringify(unavailable.body).includes("private database details"), false);
});

test("authentication routes validate input and protected routes require a valid bearer token", async () => {
  const app = createApp({ pool: { execute: async () => { throw new Error("should not reach database"); } }, config, logger: silentLogger });
  const badRegister = await request(app).post("/api/auth/register").send({ name: "A", email: "bad", password: "x" });
  assert.equal(badRegister.status, 400);
  assert.equal(badRegister.body.error.code, "VALIDATION_ERROR");

  const missingToken = await request(app).get("/api/projects");
  assert.equal(missingToken.status, 401);
  const invalidToken = await request(app).get("/api/tasks").set("Authorization", "Bearer not-a-jwt");
  assert.equal(invalidToken.status, 401);
});

test("task filter parsing validates enums and pagination, and supplies defaults", () => {
  assert.deepEqual(parse(taskFiltersSchema, {}), { search: "", page: 1, pageSize: 20 });
  assert.deepEqual(parse(taskFiltersSchema, { status: "todo", priority: "high", page: "2", pageSize: "5" }), {
    search: "", status: "todo", priority: "high", page: 2, pageSize: 5,
  });
  assert.throws(() => parse(taskFiltersSchema, { status: "finished" }));
  assert.throws(() => parse(taskFiltersSchema, { pageSize: "1000" }));
});

test("test database configuration refuses the configured development database", () => {
  const old = { DB_NAME: process.env.DB_NAME, TEST_DB_NAME: process.env.TEST_DB_NAME };
  process.env.DB_NAME = "taskflow";
  process.env.TEST_DB_NAME = "TaskFlow";
  try {
    assert.throws(() => getConfig({ forTests: true }), /must be different from DB_NAME/);
  } finally {
    if (old.DB_NAME === undefined) delete process.env.DB_NAME;
    else process.env.DB_NAME = old.DB_NAME;
    if (old.TEST_DB_NAME === undefined) delete process.env.TEST_DB_NAME;
    else process.env.TEST_DB_NAME = old.TEST_DB_NAME;
  }
});

test("application configuration explicitly refuses the MySQL root account", () => {
  const names = ["DB_NAME", "TEST_DB_NAME", "DB_USER", "DB_PASSWORD", "JWT_SECRET"];
  const old = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  Object.assign(process.env, {
    DB_NAME: "taskflow",
    TEST_DB_NAME: "taskflow_test",
    DB_USER: "root",
    DB_PASSWORD: "test-only-password",
    JWT_SECRET: "test-secret-that-is-long-enough-for-unit-testing-only",
  });
  try {
    assert.throws(() => getConfig({ forTests: true }), /MySQL root is not allowed/);
  } finally {
    for (const name of names) {
      if (old[name] === undefined) delete process.env[name];
      else process.env[name] = old[name];
    }
  }
});

test("migration runner executes only the additive versioned SQL without drop statements", async () => {
  const executed = [];
  const pool = {
    async query(sql) { executed.push(sql); return [[], []]; },
    async execute(sql) {
      if (sql.startsWith("SELECT version")) return [[], []];
      executed.push(sql);
      return [{}, []];
    },
    async getConnection() {
      return {
        async query(sql) { executed.push(sql); return [[], []]; },
        async execute(sql) { executed.push(sql); return [{}, []]; },
        release() {},
      };
    },
  };
  const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  await runMigrations(pool, path.join(backendRoot, "database", "migrations"));
  assert.equal(executed.filter((sql) => sql.includes("CREATE TABLE IF NOT EXISTS")).length, 4);
  assert.equal(executed.some((sql) => /\bDROP\s+(TABLE|DATABASE)\b/i.test(sql)), false);
});

test("registration rejects passwords that exceed bcrypt's UTF-8 byte input limit", () => {
  const result = registerSchema.safeParse({ name: "Test User", email: "test@example.com", password: "é".repeat(40) });
  assert.equal(result.success, false);
});

test("dashboard stats include user-scoped status totals and recent project aggregates", async () => {
  const calls = [];
  const pool = { async execute(sql, values) {
    calls.push({ sql, values });
    if (sql.includes("totalProjects")) return [[{ totalProjects: "1", totalTasks: "3", completedTasks: "1", overdueTasks: "1" }]];
    if (sql.includes("AS in_progress")) return [[{ todo: "1", in_progress: "1", done: "1" }]];
    return [[{ id: 4, name: "Recent", description: null, createdAt: "2026-01-01 00:00:00", taskCount: "3", completedTaskCount: "1", progress: "33" }]];
  } };
  const stats = await createDashboardService(pool).stats(42);
  assert.deepEqual(stats, {
    totalProjects: 1, totalTasks: 3, completedTasks: 1, overdueTasks: 1,
    byStatus: { todo: 1, in_progress: 1, done: 1 },
    recentProjects: [{ id: 4, name: "Recent", description: null, createdAt: "2026-01-01 00:00:00", taskCount: "3", completedTaskCount: "1", progress: "33" }],
  });
  assert.equal(calls.length, 3);
  assert.equal(calls.every(({ values }) => values.includes(42)), true);
  assert.match(calls[2].sql, /LIMIT 4/);
});

test("environment loading resolves Backend/.env independently of the caller working directory", { skip: !existsSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env")) }, () => {
  const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const projectRoot = path.resolve(backendRoot, "..");
  const env = { ...process.env };
  for (const name of ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD", "JWT_SECRET", "PORT", "CLIENT_URL", "NODE_ENV"]) {
    delete env[name];
  }
  const result = spawnSync(process.execPath, [
    "--input-type=module",
    "-e",
    "import { getDatabaseConfig } from './Backend/src/config/env.js'; getDatabaseConfig(); console.log('CONFIG_OK')",
  ], { cwd: projectRoot, env, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "CONFIG_OK");
});

test("migration diagnostics show MySQL codes but redact password, JWT, and login identity", () => {
  const error = new Error("Access denied for user 'taskflow_app'@'localhost' using password jwt-secret");
  assert.equal(
    safeMigrationErrorMessage(error, ["using password", "jwt-secret"]),
    "Access denied for user [REDACTED] [REDACTED] [REDACTED]",
  );
});
