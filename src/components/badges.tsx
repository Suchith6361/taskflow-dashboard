import { cn } from "@/lib/utils";
import { PRIORITY_LABELS, STATUS_LABELS, type TaskPriority, type TaskStatus } from "@/types";

const statusCls: Record<TaskStatus, string> = {
  todo: "bg-status-todo/15 text-status-todo",
  in_progress: "bg-status-progress/15 text-status-progress",
  done: "bg-status-done/15 text-status-done",
};
const prioCls: Record<TaskPriority, string> = {
  low: "border-border text-muted-foreground",
  medium: "border-status-progress/40 text-status-progress",
  high: "border-destructive/40 text-destructive",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", statusCls[status])}>
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-xs font-medium", prioCls[priority])}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
