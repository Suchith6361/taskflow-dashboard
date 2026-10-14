export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string; // ISO
}

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null; // YYYY-MM-DD
  createdAt: string;
}

export type ProjectInput = Pick<Project, "name" | "description">;
export type TaskInput = Omit<Task, "id" | "createdAt">;

export interface TaskFilters {
  search?: string;
  status?: TaskStatus | "all";
  priority?: TaskPriority | "all";
}

export interface ProjectWithStats extends Project {
  totalTasks: number;
  completedTasks: number;
  progress: number; // 0-100
}

export interface DashboardStats {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  byStatus: Record<TaskStatus, number>;
  recentProjects: ProjectWithStats[];
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};
