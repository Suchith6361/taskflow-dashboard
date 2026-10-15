import { useSyncExternalStore } from "react";
import { authService } from "@/services/authService";

let cache: { raw: string | null; user: ReturnType<typeof authService.currentUser> } = { raw: null, user: null };
function snapshot() {
  const u = authService.currentUser();
  const raw = JSON.stringify(u);
  if (raw !== cache.raw) cache = { raw, user: u };
  return cache.user;
}

export function useAuth() {
  const user = useSyncExternalStore(authService.subscribe, snapshot, () => null);
  return { user };
}
