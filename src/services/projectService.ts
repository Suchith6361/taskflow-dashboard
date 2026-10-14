// Project data access. Swap the bodies for fetch() calls to `/api/projects` later.
import type { Project, ProjectInput, ProjectWithStats, Task } from "@/types";
import { delay, getDb, saveDb, uid } from "./mockDb";

export function withStats(p: Project, tasks: Task[]): ProjectWithStats {
  const own = tasks.filter((t) => t.projectId === p.id);
  const done = own.filter((t) => t.status === "done").length;
  return { ...p, totalTasks: own.length, completedTasks: done, progress: own.length ? Math.round((done / own.length) * 100) : 0 };
}

export const projectService = {
  async list(): Promise<ProjectWithStats[]> {
    await delay();
    const { projects, tasks } = getDb();
    return [...projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((p) => withStats(p, tasks));
  },
  async create(input: ProjectInput): Promise<Project> {
    await delay();
    const p: Project = { id: uid(), ...input, createdAt: new Date().toISOString() };
    getDb().projects.push(p);
    saveDb();
    return p;
  },
  async update(id: string, input: ProjectInput): Promise<Project> {
    await delay();
    const p = getDb().projects.find((x) => x.id === id);
    if (!p) throw new Error("Project not found");
    Object.assign(p, input);
    saveDb();
    return p;
  },
  async remove(id: string): Promise<void> {
    await delay();
    const db = getDb();
    db.projects = db.projects.filter((p) => p.id !== id);
    db.tasks = db.tasks.filter((t) => t.projectId !== id);
    saveDb();
  },
};
