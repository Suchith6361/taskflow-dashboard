import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProjectDialog } from "@/components/ProjectDialog";
import { EmptyState, ErrorState, PageHeader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteProject, useProjects } from "@/hooks/use-data";
import type { ProjectWithStats } from "@/types";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({
    meta: [
      { title: "Projects — TaskFlow" },
      { name: "description", content: "Create and manage your projects." },
      { property: "og:title", content: "Projects — TaskFlow" },
      { property: "og:description", content: "Create and manage your projects." },
    ],
  }),
  component: Projects,
});

function Projects() {
  const { data, isLoading, isError, error, refetch } = useProjects();
  const del = useDeleteProject();
  const [editing, setEditing] = useState<ProjectWithStats | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ProjectWithStats | null>(null);

  const openNew = () => { setEditing(null); setDialogOpen(true); };

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Group related tasks and track progress."
        action={<Button onClick={openNew}><Plus /> New project</Button>}
      />
      {isError ? <ErrorState message={(error as Error).message} onRetry={() => refetch()} /> :
       isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}</div>
      ) : data!.length === 0 ? (
        <EmptyState title="No projects yet" description="Create your first project to start organizing tasks." action={<Button onClick={openNew}><Plus /> New project</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data!.map((p) => (
            <Card key={p.id} className="py-5 transition-shadow hover:shadow-md">
              <CardContent className="flex h-full flex-col px-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight">{p.name}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="-mr-2 -mt-1 size-8" aria-label="Project actions"><MoreHorizontal /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditing(p); setDialogOpen(true); }}><Pencil /> Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setToDelete(p)}><Trash2 /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-muted-foreground">{p.description || "No description"}</p>
                <div className="mt-5 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{p.completedTasks} of {p.totalTasks} tasks done</span>
                    <span className="font-medium text-foreground">{p.progress}%</span>
                  </div>
                  <Progress value={p.progress} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">Created {format(new Date(p.createdAt), "MMM d, yyyy")}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} project={editing} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete "${toDelete?.name}"?`}
        description={`This will permanently delete the project and its ${toDelete?.totalTasks ?? 0} task(s).`}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}
