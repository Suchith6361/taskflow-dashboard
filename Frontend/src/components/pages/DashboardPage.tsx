"use client";

import { format } from "date-fns";
import { AlertCircle, CheckCircle2, FolderKanban, ListTodo } from "lucide-react";
import { ErrorState, PageHeader } from "@/components/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useStats } from "@/hooks/use-data";
import { STATUS_LABELS, type TaskStatus } from "@/types";
import type { ComponentType, ReactNode } from "react";

const barCls: Record<TaskStatus, string> = {
  todo: "bg-status-todo",
  in_progress: "bg-status-progress",
  done: "bg-status-done",
};

type DashboardLinkProps = { href: string; className?: string; children: ReactNode };

function DefaultLink({ href, className, children }: DashboardLinkProps) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

export function DashboardPage({
  LinkComponent = DefaultLink,
}: { LinkComponent?: ComponentType<DashboardLinkProps> } = {}) {
  const { data, isLoading, isError, error, refetch } = useStats();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="A snapshot of everything happening in your workspace."
      />
      {isError ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total projects", value: data?.totalProjects, icon: FolderKanban },
              { label: "Total tasks", value: data?.totalTasks, icon: ListTodo },
              { label: "Completed", value: data?.completedTasks, icon: CheckCircle2 },
              { label: "Overdue", value: data?.overdueTasks, icon: AlertCircle, danger: true },
            ].map((s) => (
              <Card key={s.label} className="gap-2 py-5">
                <CardContent className="flex items-center justify-between px-5">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    {isLoading ? (
                      <Skeleton className="mt-2 h-8 w-12" />
                    ) : (
                      <p
                        className={`mt-1 text-3xl font-semibold tracking-tight ${s.danger && s.value ? "text-destructive" : ""}`}
                      >
                        {s.value}
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg bg-accent p-2.5 text-accent-foreground">
                    <s.icon className="size-5" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Recent projects</CardTitle>
                <LinkComponent
                  href="/projects"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  View all
                </LinkComponent>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)
                ) : data!.recentProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No projects yet.</p>
                ) : (
                  data!.recentProjects.map((p) => (
                    <div key={p.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{p.name}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {p.completedTasks}/{p.totalTasks} Â·{" "}
                          {format(new Date(p.createdAt), "MMM d")}
                        </span>
                      </div>
                      <Progress value={p.progress} className="h-1.5" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Task status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <Skeleton className="h-32" />
                ) : (
                  <>
                    <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                      {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
                        <div
                          key={s}
                          className={barCls[s]}
                          style={{
                            width: `${data!.totalTasks ? (data!.byStatus[s] / data!.totalTasks) * 100 : 0}%`,
                          }}
                        />
                      ))}
                    </div>
                    {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
                      <div key={s} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className={`size-2.5 rounded-full ${barCls[s]}`} />
                          {STATUS_LABELS[s]}
                        </span>
                        <span className="font-medium">{data!.byStatus[s]}</span>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
