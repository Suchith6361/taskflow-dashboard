import type { Project, ProjectInput, ProjectWithStats } from "@/types";
import { apiRequest } from "./apiClient";

type ApiProject = {
  id: number | string;
  name: string;
  description: string | null;
  createdAt: string | Date;
  taskCount?: number | string;
  completedTaskCount?: number | string;
  progress?: number | string;
};

function normalizeProject(row: ApiProject): Project {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description ?? "",
    createdAt: new Date(row.createdAt).toISOString(),
  };
}
function normalizeWithStats(row: ApiProject): ProjectWithStats {
  const totalTasks = Number(row.taskCount ?? 0);
  const completedTasks = Number(row.completedTaskCount ?? 0);
  return {
    ...normalizeProject(row),
    totalTasks,
    completedTasks,
    progress: Number(
      row.progress ?? (totalTasks ? Math.round((100 * completedTasks) / totalTasks) : 0),
    ),
  };
}

export const projectService = {
  async list(): Promise<ProjectWithStats[]> {
    const rows = await apiRequest<ApiProject[]>("/projects");
    return rows.map(normalizeWithStats);
  },
  async create(input: ProjectInput): Promise<Project> {
    const { project } = await apiRequest<{ project: ApiProject }>("/projects", {
      method: "POST",
      body: JSON.stringify({ ...input, description: input.description || null }),
    });
    return normalizeProject(project);
  },
  async update(id: string, input: ProjectInput): Promise<Project> {
    const { project } = await apiRequest<{ project: ApiProject }>(
      `/projects/${encodeURIComponent(id)}`,
      { method: "PUT", body: JSON.stringify({ ...input, description: input.description || null }) },
    );
    return normalizeProject(project);
  },
  async remove(id: string): Promise<void> {
    await apiRequest<{ deleted: boolean }>(`/projects/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};
