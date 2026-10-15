import type { DashboardStats, Task, TaskFilters, TaskInput, TaskStatus } from "@/types";
import { apiRequest, apiRequestWithMeta } from "./apiClient";

type ApiTask = Omit<Task, "id" | "projectId" | "description" | "createdAt"> & {
  id: number | string;
  projectId: number | string;
  description: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
  userId?: number;
};
type ApiProject = {
  id: number | string;
  name: string;
  description: string | null;
  createdAt: string | Date;
  taskCount: number | string;
  completedTaskCount: number | string;
  progress: number | string;
};
type ApiDashboardStats = {
  totalProjects: number | string;
  totalTasks: number | string;
  completedTasks: number | string;
  overdueTasks: number | string;
  byStatus: Record<TaskStatus, number | string>;
  recentProjects: ApiProject[];
};
type TaskPagination = { totalPages: number; page: number; pageSize: number; total: number };
const normalizeTask = (row: ApiTask): Task => ({
  id: String(row.id),
  projectId: String(row.projectId),
  title: row.title,
  description: row.description ?? "",
  status: row.status,
  priority: row.priority,
  dueDate: row.dueDate ? String(row.dueDate).slice(0, 10) : null,
  createdAt: new Date(row.createdAt).toISOString(),
});

export const todayStr = () => new Date().toISOString().slice(0, 10);
export const isOverdue = (t: Task) => t.status !== "done" && !!t.dueDate && t.dueDate < todayStr();

// Kept as a pure helper for existing consumers and tests; filtering itself is server-side.
export function filterTasks(tasks: Task[], f: TaskFilters): Task[] {
  const q = f.search?.trim().toLowerCase() ?? "";
  return tasks.filter(
    (t) =>
      (!q || t.title.toLowerCase().includes(q)) &&
      (!f.status || f.status === "all" || t.status === f.status) &&
      (!f.priority || f.priority === "all" || t.priority === f.priority),
  );
}

export const taskService = {
  async list(filters: TaskFilters = {}): Promise<Task[]> {
    const query = new URLSearchParams({ page: "1", pageSize: "100" });
    if (filters.search?.trim()) query.set("search", filters.search.trim());
    if (filters.status && filters.status !== "all") query.set("status", filters.status);
    if (filters.priority && filters.priority !== "all") query.set("priority", filters.priority);
    const first = await apiRequestWithMeta<ApiTask[]>(`/tasks?${query}`);
    const pagination = (first.meta as { pagination: TaskPagination }).pagination;
    const rows = [...first.data];
    for (let page = 2; page <= pagination.totalPages; page++) {
      query.set("page", String(page));
      const result = await apiRequestWithMeta<ApiTask[]>(`/tasks?${query}`);
      rows.push(...result.data);
    }
    return rows.map(normalizeTask);
  },
  async stats(): Promise<DashboardStats> {
    const { stats } = await apiRequest<{ stats: ApiDashboardStats }>("/dashboard/stats");
    return {
      ...stats,
      totalProjects: Number(stats.totalProjects),
      totalTasks: Number(stats.totalTasks),
      completedTasks: Number(stats.completedTasks),
      overdueTasks: Number(stats.overdueTasks),
      byStatus: {
        todo: Number(stats.byStatus.todo),
        in_progress: Number(stats.byStatus.in_progress),
        done: Number(stats.byStatus.done),
      },
      recentProjects: stats.recentProjects.map((p) => {
        const totalTasks = Number(p.taskCount);
        const completedTasks = Number(p.completedTaskCount);
        return {
          id: String(p.id),
          name: p.name,
          description: p.description ?? "",
          createdAt: new Date(p.createdAt).toISOString(),
          totalTasks,
          completedTasks,
          progress: Number(
            p.progress ?? (totalTasks ? Math.round((completedTasks * 100) / totalTasks) : 0),
          ),
        };
      }),
    };
  },
  async create(input: TaskInput): Promise<Task> {
    const { task } = await apiRequest<{ task: ApiTask }>("/tasks", {
      method: "POST",
      body: JSON.stringify({
        ...input,
        projectId: Number(input.projectId),
        description: input.description || null,
        dueDate: input.dueDate || null,
      }),
    });
    return normalizeTask(task);
  },
  async update(id: string, input: Partial<TaskInput>): Promise<Task> {
    if (Object.keys(input).length === 1 && input.status) return this.updateStatus(id, input.status);
    const current = input as TaskInput;
    const body = {
      ...current,
      projectId: Number(current.projectId),
      description: current.description || null,
      dueDate: current.dueDate || null,
    };
    const { task } = await apiRequest<{ task: ApiTask }>(`/tasks/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return normalizeTask(task);
  },
  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    const { task } = await apiRequest<{ task: ApiTask }>(
      `/tasks/${encodeURIComponent(id)}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) },
    );
    return normalizeTask(task);
  },
  async remove(id: string): Promise<void> {
    await apiRequest<{ deleted: boolean }>(`/tasks/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};
