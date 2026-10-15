import { afterEach, describe, expect, it, vi } from "vitest";
import { filterTasks, isOverdue, taskService } from "./taskService";
import type { Task } from "@/types";

const mk = (o: Partial<Task>): Task => ({
  id: "x",
  title: "Task",
  description: "",
  projectId: "p",
  status: "todo",
  priority: "low",
  dueDate: null,
  createdAt: "",
  ...o,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("filterTasks", () => {
  const tasks = [
    mk({ id: "1", title: "Design hero", status: "todo", priority: "high" }),
    mk({ id: "2", title: "Design footer", status: "done", priority: "high" }),
    mk({ id: "3", title: "Write copy", status: "todo", priority: "low" }),
  ];
  it("searches by title, case-insensitive", () => {
    expect(filterTasks(tasks, { search: "design" }).map((t) => t.id)).toEqual(["1", "2"]);
  });
  it("combines status and priority filters", () => {
    expect(filterTasks(tasks, { status: "todo", priority: "high" }).map((t) => t.id)).toEqual([
      "1",
    ]);
  });
});

describe("isOverdue", () => {
  it("is overdue only when past due and not done", () => {
    expect(isOverdue(mk({ dueDate: "2000-01-01" }))).toBe(true);
    expect(isOverdue(mk({ dueDate: "2000-01-01", status: "done" }))).toBe(false);
  });
});

describe("taskService API", () => {
  it("aggregates task pages once and sends server-side filters", async () => {
    const task = (id: number) => ({
      id,
      projectId: 3,
      userId: 1,
      title: `Task ${id}`,
      description: null,
      status: "todo",
      priority: "high",
      dueDate: null,
      createdAt: "2026-01-01 00:00:00",
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: [task(1), task(2)],
            meta: { pagination: { page: 1, pageSize: 100, total: 101, totalPages: 2 } },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: [task(101)],
            meta: { pagination: { page: 2, pageSize: 100, total: 101, totalPages: 2 } },
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const result = await taskService.list({ search: "Task", status: "todo", priority: "high" });
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ id: "1", projectId: "3", description: "" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("search=Task");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("status=todo");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("page=2");
  });

  it("updates status through the dedicated PATCH endpoint", async () => {
    const task = {
      id: 5,
      projectId: 2,
      title: "Done",
      description: null,
      status: "done",
      priority: "medium",
      dueDate: null,
      createdAt: "2026-01-01 00:00:00",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: { task } }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(taskService.updateStatus("5", "done")).resolves.toMatchObject({
      id: "5",
      status: "done",
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/tasks/5/status");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("PATCH");
  });
});
