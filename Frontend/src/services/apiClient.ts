export type ApiEnvelope<T> =
  | { success: true; data: T; meta?: unknown }
  | { success: false; error?: { code?: string; message?: string; details?: unknown } };
export type ApiResult<T> = { data: T; meta?: unknown };

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly details: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class NetworkError extends Error {
  constructor(message = "Unable to reach the TaskFlow API. Check that the backend is running.") {
    super(message);
    this.name = "NetworkError";
  }
}

const TOKEN_KEY = "taskflow-access-token";
// The API currently issues bearer tokens rather than httpOnly cookies. localStorage enables refresh persistence,
// but JavaScript can read it; an XSS vulnerability could steal this token until its one-hour expiry.
export const SESSION_LOST_EVENT = "taskflow:session-lost";

export const tokenStorage = {
  get(): string | null {
    return typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);
  },
  set(token: string) {
    if (typeof window !== "undefined") window.localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
  },
};

export function notifySessionLost() {
  tokenStorage.clear();
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_LOST_EVENT));
}

const API_BASE_URL = (
  (typeof process !== "undefined" ? process.env["NEXT_PUBLIC_API_BASE_URL"] : undefined) ||
  "http://localhost:5000/api"
).replace(/\/$/, "");

export async function apiRequestWithMeta<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<ApiResult<T>> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (authenticated) {
    const token = tokenStorage.get();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, cache: "no-store" });
  } catch {
    throw new NetworkError();
  }

  let body: ApiEnvelope<T> | undefined;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    if (response.ok)
      throw new ApiError("The server returned an invalid response.", response.status);
  }

  if (!response.ok || !body || body.success === false) {
    const error = body && !body.success ? body.error : undefined;
    if (response.status === 401 && authenticated) notifySessionLost();
    throw new ApiError(
      error?.message || `Request failed (${response.status}).`,
      response.status,
      error?.code,
      error?.details,
    );
  }
  return { data: body.data, meta: body.meta };
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  return (await apiRequestWithMeta<T>(path, options, authenticated)).data;
}
