// Task data access. Swap the bodies for fetch() calls to `/api/tasks` later.
import type { DashboardStats, Task, TaskFilters, TaskInput, TaskStatus } from "@/types";
import { delay, getDb, saveDb, uid } from "./mockDb";
import { withStats } from "./projectService";

export const todayStr = () => new Date().toISOString().slice(0, 10);
export const isOverdue = (t: Task) => t.status !== "done" && !!t.dueDate && t.dueDate < todayStr();

export function filterTasks(tasks: Task[], f: TaskFilters): Task[] {
  const q = f.search?.trim().toLowerCase() ?? "";
  return tasks.filter(
    (t) =>
      (!q || t.title.toLowerCase().includes(q)) &&
      (!f.status || f.status === "all" || t.status === f.status) &&
      (!f.priority || f.priority === "all" || t.priority === f.priority),
  );
}

export function computeStats(db: ReturnType<typeof getDb>): DashboardStats {
  const byStatus: Record<TaskStatus, number> = { todo: 0, in_progress: 0, done: 0 };
  db.tasks.forEach((t) => byStatus[t.status]++);
  return {
    totalProjects: db.projects.length,
    totalTasks: db.tasks.length,
    completedTasks: byStatus.done,
    overdueTasks: db.tasks.filter(isOverdue).length,
    byStatus,
    recentProjects: [...db.projects]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 4)
      .map((p) => withStats(p, db.tasks)),
  };
}

export const taskService = {
  async list(filters: TaskFilters = {}): Promise<Task[]> {
    await delay();
    return filterTasks(getDb().tasks, filters);
  },
  async stats(): Promise<DashboardStats> {
    await delay();
    return computeStats(getDb());
  },
  async create(input: TaskInput): Promise<Task> {
    await delay();
    const t: Task = { id: uid(), ...input, createdAt: new Date().toISOString() };
    getDb().tasks.unshift(t);
    saveDb();
    return t;
  },
  async update(id: string, input: Partial<TaskInput>): Promise<Task> {
    await delay(200);
    const t = getDb().tasks.find((x) => x.id === id);
    if (!t) throw new Error("Task not found");
    Object.assign(t, input);
    saveDb();
    return t;
  },
  async remove(id: string): Promise<void> {
    await delay();
    const db = getDb();
    db.tasks = db.tasks.filter((t) => t.id !== id);
    saveDb();
  },
};
