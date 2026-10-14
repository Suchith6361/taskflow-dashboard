// MOCK authentication for the UI prototype only. NOT secure:
// users and "sessions" live in localStorage. Replace with the Express API
// (e.g. POST /api/auth/login returning an httpOnly cookie) before production.
import type { User } from "@/types";
import { delay, uid } from "./mockDb";

const USERS_KEY = "taskflow-mock-users";
const SESSION_KEY = "taskflow-mock-session";

type StoredUser = User & { password: string };
const listeners = new Set<() => void>();

const readUsers = (): StoredUser[] => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
};

export const authService = {
  currentUser(): User | null {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  async register(name: string, email: string, password: string): Promise<User> {
    await delay(500);
    const users = readUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) throw new Error("An account with this email already exists.");
    const user: StoredUser = { id: uid(), name, email, password };
    localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
    return this.setSession(user);
  },
  async login(email: string, password: string): Promise<User> {
    await delay(500);
    const u = readUsers().find((x) => x.email.toLowerCase() === email.toLowerCase() && x.password === password);
    if (!u) throw new Error("Invalid email or password.");
    return this.setSession(u);
  },
  setSession(u: StoredUser): User {
    const user: User = { id: u.id, name: u.name, email: u.email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    listeners.forEach((l) => l());
    return user;
  },
  logout() {
    localStorage.removeItem(SESSION_KEY);
    listeners.forEach((l) => l());
  },
};
