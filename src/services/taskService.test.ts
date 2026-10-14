import { describe, expect, it } from "vitest";
import { filterTasks, isOverdue } from "./taskService";
import type { Task } from "@/types";

const mk = (o: Partial<Task>): Task => ({ id: "x", title: "Task", description: "", projectId: "p", status: "todo", priority: "low", dueDate: null, createdAt: "", ...o });

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
    expect(filterTasks(tasks, { status: "todo", priority: "high" }).map((t) => t.id)).toEqual(["1"]);
  });
});

describe("isOverdue", () => {
  it("is overdue only when past due and not done", () => {
    expect(isOverdue(mk({ dueDate: "2000-01-01" }))).toBe(true);
    expect(isOverdue(mk({ dueDate: "2000-01-01", status: "done" }))).toBe(false);
  });
});
