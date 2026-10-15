import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authService } from "@/services/authService";
import { DashboardPage } from "./DashboardPage";
import { LoginPage } from "./LoginPage";
import { ProjectsPage } from "./ProjectsPage";
import { RegisterPage } from "./RegisterPage";
import { TasksPage } from "./TasksPage";

type ProjectRow = { id: number; name: string; description: string | null; createdAt: string };
type TaskRow = {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  createdAt: string;
};
let projects: ProjectRow[];
let tasks: TaskRow[];
let nextProject: number;
let nextTask: number;

const makeTask = (
  id: number,
  projectId: number,
  title: string,
  status: TaskRow["status"] = "todo",
  priority: TaskRow["priority"] = "low",
): TaskRow => ({
  id,
  projectId,
  title,
  description: null,
  status,
  priority,
  dueDate: null,
  createdAt: new Date(Date.now() - id * 1000).toISOString(),
});
const envelope = (data: unknown, status = 200, meta?: unknown) =>
  new Response(JSON.stringify({ success: true, data, ...(meta ? { meta } : {}) }), { status });

function mockApi() {
  projects = ["Website Redesign", "Mobile App", "Marketing", "Internal Tools"].map((name, i) => ({
    id: i + 1,
    name,
    description: "Seed project",
    createdAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
  }));
  nextProject = 5;
  tasks = [
    makeTask(1, 1, "Audit existing pages"),
    makeTask(2, 1, "Push notification service", "todo", "high"),
    makeTask(3, 2, "Build dashboard", "in_progress", "medium"),
    makeTask(4, 2, "Write onboarding flow", "done", "high"),
    ...Array.from({ length: 8 }, (_, i) =>
      makeTask(
        i + 5,
        (i % 4) + 1,
        `Seed task ${i + 1}`,
        i % 3 === 0 ? "done" : "todo",
        i % 2 ? "medium" : "low",
      ),
    ),
  ];
  nextTask = 13;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const path = url.pathname.replace(/^\/api/, "");
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (path === "/auth/register" || path === "/auth/login")
        return envelope(
          {
            user: { id: 1, name: body.name || "Ava Tester", email: body.email },
            token: "test-jwt",
          },
          path.endsWith("register") ? 201 : 200,
        );
      if (path === "/auth/me")
        return envelope({ user: { id: 1, name: "Ava Tester", email: "ava@example.com" } });
      if (path === "/projects" && method === "GET") return envelope(projects.map(projectStats));
      if (path === "/projects" && method === "POST") {
        const row = {
          id: nextProject++,
          name: body.name,
          description: body.description,
          createdAt: new Date().toISOString(),
        };
        projects.unshift(row);
        return envelope({ project: row }, 201);
      }
      const projectMatch = path.match(/^\/projects\/(\d+)$/);
      if (projectMatch) {
        const id = Number(projectMatch[1]);
        if (method === "PUT") {
          const p = projects.find((x) => x.id === id)!;
          Object.assign(p, body);
          return envelope({ project: p });
        }
        if (method === "DELETE") {
          projects = projects.filter((p) => p.id !== id);
          tasks = tasks.filter((t) => t.projectId !== id);
          return envelope({ deleted: true });
        }
        return envelope({ project: projectStats(projects.find((p) => p.id === id)!) });
      }
      if (path === "/tasks" && method === "GET") {
        const filtered = tasks.filter(
          (task) =>
            (!url.searchParams.get("search") ||
              task.title.toLowerCase().includes(url.searchParams.get("search")!.toLowerCase())) &&
            (!url.searchParams.get("status") || task.status === url.searchParams.get("status")) &&
            (!url.searchParams.get("priority") ||
              task.priority === url.searchParams.get("priority")),
        );
        const page = Number(url.searchParams.get("page") || 1);
        const pageSize = Number(url.searchParams.get("pageSize") || 20);
        const items = filtered.slice((page - 1) * pageSize, page * pageSize);
        return envelope(items, 200, {
          pagination: {
            page,
            pageSize,
            total: filtered.length,
            totalPages: Math.ceil(filtered.length / pageSize),
          },
        });
      }
      if (path === "/tasks" && method === "POST") {
        const task = {
          ...body,
          id: nextTask++,
          description: body.description ?? null,
          createdAt: new Date().toISOString(),
        } as TaskRow;
        tasks.unshift(task);
        return envelope({ task }, 201);
      }
      const taskMatch = path.match(/^\/tasks\/(\d+)(\/status)?$/);
      if (taskMatch) {
        const task = tasks.find((x) => x.id === Number(taskMatch[1]))!;
        if (taskMatch[2] && method === "PATCH") Object.assign(task, body);
        else if (method === "PUT") Object.assign(task, body);
        else if (method === "DELETE") {
          tasks = tasks.filter((x) => x.id !== task.id);
          return envelope({ deleted: true });
        }
        return envelope({ task });
      }
      if (path === "/dashboard/stats") {
        const byStatus = {
          todo: tasks.filter((t) => t.status === "todo").length,
          in_progress: tasks.filter((t) => t.status === "in_progress").length,
          done: tasks.filter((t) => t.status === "done").length,
        };
        return envelope({
          stats: {
            totalProjects: projects.length,
            totalTasks: tasks.length,
            completedTasks: byStatus.done,
            overdueTasks: 0,
            byStatus,
            recentProjects: [...projects]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 4)
              .map(projectStats),
          },
        });
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "NOT_FOUND", message: `Unhandled test API request ${method} ${path}` },
        }),
        { status: 404 },
      );
    }),
  );
}

function projectStats(project: ProjectRow) {
  const own = tasks.filter((task) => task.projectId === project.id);
  const completedTaskCount = own.filter((task) => task.status === "done").length;
  return {
    ...project,
    taskCount: own.length,
    completedTaskCount,
    progress: own.length ? Math.round((completedTaskCount * 100) / own.length) : 0,
  };
}

afterEach(() => {
  cleanup();
  authService.logout();
  localStorage.clear();
  vi.unstubAllGlobals();
});
beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
  mockApi();
});

function renderWithQuery(
  ui: ReactNode,
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  return {
    queryClient,
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
  };
}

describe("TaskFlow migrated pages with mocked API responses", () => {
  it("validates registration and sends registration/login requests", async () => {
    const onRegistered = vi.fn();
    const registerView = render(<RegisterPage onAuthenticated={onRegistered} />);
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Name must be at least 2 characters")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email")).toBeInTheDocument();
    expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Ava Tester" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ava@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "taskflow123" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "taskflow123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(onRegistered).toHaveBeenCalledOnce());
    expect(authService.currentUser()?.email).toBe("ava@example.com");
    registerView.unmount();
    authService.logout();
    const onLoggedIn = vi.fn();
    render(<LoginPage onAuthenticated={onLoggedIn} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ava@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "taskflow123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(onLoggedIn).toHaveBeenCalledOnce());
    expect(authService.currentUser()?.email).toBe("ava@example.com");
  });

  it("creates, edits and deletes projects and refreshes dashboard totals", async () => {
    const { queryClient, unmount } = renderWithQuery(<ProjectsPage />);
    await screen.findByText("Website Redesign");
    fireEvent.click(screen.getByRole("button", { name: "New project" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Migration QA Project" } });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Created in the API check." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create project" }));
    await screen.findByText("Migration QA Project");
    const dashboard = renderWithQuery(<DashboardPage />, queryClient);
    const projectStat = screen.getByText("Total projects").parentElement;
    await waitFor(() => expect(within(projectStat!).getByText("5")).toBeInTheDocument());
    dashboard.unmount();
    fireEvent.keyDown(screen.getAllByRole("button", { name: "Project actions" })[0]!, {
      key: "Enter",
    });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Updated Migration QA Project" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText("Updated Migration QA Project");
    fireEvent.keyDown(screen.getAllByRole("button", { name: "Project actions" })[0]!, {
      key: "Enter",
    });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(screen.queryByText("Updated Migration QA Project")).not.toBeInTheDocument(),
    );
    unmount();
    queryClient.clear();
  });

  it("supports task CRUD, search and combined status/priority filters", async () => {
    const { queryClient, unmount } = renderWithQuery(<TasksPage />);
    await screen.findByText("Audit existing pages");
    await waitFor(() => expect(screen.getByRole("button", { name: "New task" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "New task" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Migration QA task" } });
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));
    await screen.findByText("Migration QA task");
    const dashboard = renderWithQuery(<DashboardPage />, queryClient);
    const taskStat = screen.getByText("Total tasks").parentElement;
    await waitFor(() => expect(within(taskStat!).getByText("13")).toBeInTheDocument());
    dashboard.unmount();
    fireEvent.change(screen.getByPlaceholderText(/Search by title/), {
      target: { value: "Migration QA" },
    });
    await waitFor(() => {
      expect(screen.getByText("Migration QA task")).toBeInTheDocument();
      expect(screen.queryByText("Audit existing pages")).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Filter by status" }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("option", { name: "To Do" }));
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Filter by priority" }), {
      key: "Enter",
    });
    fireEvent.click(await screen.findByRole("option", { name: "High" }));
    await waitFor(() => expect(screen.queryByText("Migration QA task")).not.toBeInTheDocument());
    expect(await screen.findByText("Push notification service")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    fireEvent.keyDown(screen.getAllByRole("button", { name: "Task actions" })[0]!, {
      key: "Enter",
    });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Updated Migration QA task" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText("Updated Migration QA task");
    fireEvent.keyDown(screen.getAllByRole("button", { name: "Task actions" })[0]!, {
      key: "Enter",
    });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(screen.queryByText("Updated Migration QA task")).not.toBeInTheDocument(),
    );
    unmount();
    queryClient.clear();
  }, 20000);
});
