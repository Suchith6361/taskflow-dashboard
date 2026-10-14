// In-memory mock data store (persisted to localStorage in the browser).
// Replace the services that use this with REST calls to the Express API later.
import type { Project, Task } from "@/types";

const KEY = "taskflow-mock-db-v1";

interface Db {
  projects: Project[];
  tasks: Task[];
}

const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysAgoIso = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

function seed(): Db {
  const projects: Project[] = [
    { id: "p1", name: "Website Redesign", description: "Refresh the marketing site with the new brand system.", createdAt: daysAgoIso(30) },
    { id: "p2", name: "Mobile App v2", description: "Offline mode, push notifications and a new onboarding flow.", createdAt: daysAgoIso(18) },
    { id: "p3", name: "Billing Migration", description: "Move subscriptions to the new billing provider.", createdAt: daysAgoIso(9) },
    { id: "p4", name: "Q4 Analytics", description: "Dashboards and reporting for leadership review.", createdAt: daysAgoIso(3) },
  ];
  const t = (id: string, title: string, projectId: string, status: Task["status"], priority: Task["priority"], due: number | null, description = ""): Task => ({
    id, title, description, projectId, status, priority, dueDate: due === null ? null : daysFromNow(due), createdAt: daysAgoIso(10),
  });
  const tasks: Task[] = [
    t("t1", "Audit existing pages", "p1", "done", "medium", -12, "List every page and its traffic."),
    t("t2", "Design homepage hero", "p1", "in_progress", "high", 2, "Two variants for review."),
    t("t3", "Write new pricing copy", "p1", "todo", "medium", 6),
    t("t4", "Set up CMS collections", "p1", "todo", "low", -1, "Blog, case studies, careers."),
    t("t5", "Offline sync prototype", "p2", "in_progress", "high", -2, "Spike on local-first storage."),
    t("t6", "Push notification service", "p2", "todo", "high", 9),
    t("t7", "Onboarding screens", "p2", "done", "medium", -5),
    t("t8", "Export customer list", "p3", "done", "high", -7),
    t("t9", "Map plan IDs", "p3", "in_progress", "medium", 4),
    t("t10", "Dry-run migration", "p3", "todo", "high", 12),
    t("t11", "Define KPIs", "p4", "todo", "medium", 5),
    t("t12", "Revenue dashboard", "p4", "todo", "low", null),
  ];
  return { projects, tasks };
}

let db: Db | null = null;

export function getDb(): Db {
  if (db) return db;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) return (db = JSON.parse(raw) as Db);
    } catch {
      /* ignore */
    }
  }
  db = seed();
  return db;
}

export function saveDb() {
  if (typeof window !== "undefined" && db) window.localStorage.setItem(KEY, JSON.stringify(db));
}

export const uid = () => Math.random().toString(36).slice(2, 10);

/** Simulates network latency so loading states are visible. */
export const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));
