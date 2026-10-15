import { createFileRoute } from "@tanstack/react-router";
import { TasksPage } from "@/components/pages/TasksPage";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tasks - TaskFlow" }] }),
  component: TasksPage,
});
