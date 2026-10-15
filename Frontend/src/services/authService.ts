import type { User } from "@/types";
import { apiRequest, notifySessionLost, SESSION_LOST_EVENT, tokenStorage } from "./apiClient";

type ApiUser = { id: number | string; name: string; email: string };
type AuthResponse = { user: ApiUser; token: string };
const USER_KEY = "taskflow-auth-user";
const listeners = new Set<() => void>();
let restorePromise: Promise<User | null> | null = null;

function normalizeUser(user: ApiUser): User {
  return { id: String(user.id), name: user.name, email: user.email };
}
function notify() {
  listeners.forEach((listener) => listener());
}
function storeUser(user: User | null) {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(USER_KEY);
  notify();
}
if (typeof window !== "undefined")
  window.addEventListener(SESSION_LOST_EVENT, () => storeUser(null));

async function establishSession(path: string, body: object): Promise<User> {
  const result = await apiRequest<AuthResponse>(
    path,
    { method: "POST", body: JSON.stringify(body) },
    false,
  );
  const user = normalizeUser(result.user);
  tokenStorage.set(result.token);
  storeUser(user);
  return user;
}

export const authService = {
  currentUser(): User | null {
    if (typeof window === "undefined") return null;
    try {
      const value = window.localStorage.getItem(USER_KEY);
      return value ? (JSON.parse(value) as User) : null;
    } catch {
      return null;
    }
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  register(name: string, email: string, password: string) {
    return establishSession("/auth/register", { name, email, password });
  },
  login(email: string, password: string) {
    return establishSession("/auth/login", { email, password });
  },
  async restoreSession(): Promise<User | null> {
    if (!tokenStorage.get()) {
      storeUser(null);
      return null;
    }
    if (restorePromise) return restorePromise;
    restorePromise = apiRequest<{ user: ApiUser }>("/auth/me")
      .then(({ user }) => {
        const normalized = normalizeUser(user);
        storeUser(normalized);
        return normalized;
      })
      .catch((error: unknown) => {
        if (!(
          error instanceof Error &&
          "status" in error &&
          (error as { status: number }).status === 401
        ))
          throw error;
        notifySessionLost();
        return null;
      })
      .finally(() => {
        restorePromise = null;
      });
    return restorePromise;
  },
  logout() {
    notifySessionLost();
  },
  clearSession() {
    notifySessionLost();
  },
};
