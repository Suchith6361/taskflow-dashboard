import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { MoreHorizontal, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { PriorityBadge, StatusBadge } from "@/components/badges";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TaskDialog } from "@/components/TaskDialog";
import { EmptyState, ErrorState, PageHeader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeleteTask, useProjects, useTasks, useUpdateTask } from "@/hooks/use-data";
import { isOverdue } from "@/services/taskService";
import { PRIORITY_LABELS, STATUS_LABELS, type Task, type TaskFilters, type TaskPriority, type TaskStatus } from "@/types";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — TaskFlow" },
      { name: "description", content: "Search, filter and update your tasks." },
      { property: "og:title", content: "Tasks — TaskFlow" },
      { property: "og:description", content: "Search, filter and update your tasks." },
    ],
  }),
  component: Tasks,
});

function Tasks() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TaskFilters["status"]>("all");
  const [priority, setPriority] = useState<TaskFilters["priority"]>("all");
  const filters = { search, status, priority };
  const { data: tasks, isLoading, isError, error, refetch } = useTasks(filters);
  const { data: projects = [] } = useProjects();
  const updateStatus = useUpdateTask("Status updated");
  const del = useDeleteTask();
  const [editing, setEditing] = useState<Task | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Task | null>(null);

  const projectName = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p.name])), [projects]);
  const hasFilters = !!search || status !== "all" || priority !== "all";
  const clear = () => { setSearch(""); setStatus("all"); setPriority("all"); };
  const openNew = () => { setEditing(null); setOpen(true); };

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Everything that needs doing, across all projects."
        action={<Button onClick={openNew} disabled={projects.length === 0}><Plus /> New task</Button>}
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title…" className="bg-card pl-9" />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as TaskFilters["status"])}>
          <SelectTrigger className="bg-card sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={(v) => setPriority(v as TaskFilters["priority"])}>
          <SelectTrigger className="bg-card sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {Object.entries(PRIORITY_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && <Button variant="ghost" onClick={clear}><X /> Clear</Button>}
      </div>

      {isError ? <ErrorState message={(error as Error).message} onRetry={() => refetch()} /> :
       isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : tasks!.length === 0 ? (
        hasFilters
          ? <EmptyState title="No matching tasks" description="Try a different search or filter." action={<Button variant="outline" onClick={clear}>Clear filters</Button>} />
          : <EmptyState title="No tasks yet" description={projects.length ? "Create a task to get started." : "Create a project first, then add tasks."} action={projects.length ? <Button onClick={openNew}><Plus /> New task</Button> : undefined} />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Task</TableHead>
                <TableHead className="hidden md:table-cell">Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Priority</TableHead>
                <TableHead className="hidden lg:table-cell">Due</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks!.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="max-w-xs pl-4">
                    <p className="truncate font-medium">{t.title}</p>
                    {t.description && <p className="truncate text-xs text-muted-foreground">{t.description}</p>}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{projectName[t.projectId] ?? "—"}</TableCell>
                  <TableCell>
                    <Select value={t.status} onValueChange={(v) => updateStatus.mutate({ id: t.id, data: { status: v as TaskStatus } })}>
                      <SelectTrigger size="sm" className="h-7 w-auto border-none bg-transparent px-0 shadow-none focus-visible:ring-0" aria-label="Change status">
                        <StatusBadge status={t.status} />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell"><PriorityBadge priority={t.priority as TaskPriority} /></TableCell>
                  <TableCell className={`hidden text-sm lg:table-cell ${isOverdue(t) ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                    {t.dueDate ? format(new Date(t.dueDate + "T00:00:00"), "MMM d, yyyy") : "—"}
                    {isOverdue(t) && " · Overdue"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8" aria-label="Task actions"><MoreHorizontal /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditing(t); setOpen(true); }}><Pencil /> Edit</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setToDelete(t)}><Trash2 /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TaskDialog open={open} onOpenChange={setOpen} task={editing} projects={projects} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this task?"
        description={`"${toDelete?.title}" will be permanently removed.`}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}
