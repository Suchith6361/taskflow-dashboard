import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { projectService } from "@/services/projectService";
import { taskService } from "@/services/taskService";
import type { ProjectInput, TaskFilters, TaskInput } from "@/types";

export const useProjects = () => useQuery({ queryKey: ["projects"], queryFn: () => projectService.list() });
export const useTasks = (f: TaskFilters = {}) => useQuery({ queryKey: ["tasks", f], queryFn: () => taskService.list(f) });
export const useStats = () => useQuery({ queryKey: ["stats"], queryFn: () => taskService.stats() });

function useInvalidate() {
  const qc = useQueryClient();
  return () => Promise.all(["projects", "tasks", "stats"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
}

function useMut<V>(fn: (v: V) => Promise<unknown>, success: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      invalidate();
      if (success) toast.success(success);
    },
    onError: (e: Error) => toast.error(e.message || "Something went wrong"),
  });
}

export const useCreateProject = () => useMut((v: ProjectInput) => projectService.create(v), "Project created");
export const useUpdateProject = () => useMut((v: { id: string; data: ProjectInput }) => projectService.update(v.id, v.data), "Project updated");
export const useDeleteProject = () => useMut((id: string) => projectService.remove(id), "Project deleted");
export const useCreateTask = () => useMut((v: TaskInput) => taskService.create(v), "Task created");
export const useUpdateTask = (msg = "Task updated") =>
  useMut((v: { id: string; data: Partial<TaskInput> }) => taskService.update(v.id, v.data), msg);
export const useDeleteTask = () => useMut((id: string) => taskService.remove(id), "Task deleted");
