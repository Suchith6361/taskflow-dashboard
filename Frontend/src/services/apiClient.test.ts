import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, ApiError, NetworkError, tokenStorage } from "./apiClient";

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("apiRequest", () => {
  it("attaches bearer token and unwraps the success envelope", async () => {
    tokenStorage.set("test-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: { ok: true } }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiRequest<{ ok: boolean }>("/projects")).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toBeInstanceOf(Headers);
    expect((fetchMock.mock.calls[0]?.[1]?.headers as Headers).get("Authorization")).toBe(
      "Bearer test-token",
    );
  });

  it("preserves backend error details and clears an invalid session", async () => {
    tokenStorage.set("expired-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: "UNAUTHORIZED", message: "Session expired" },
          }),
          { status: 401 },
        ),
      ),
    );
    await expect(apiRequest("/auth/me")).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHORIZED",
      message: "Session expired",
    } satisfies Partial<ApiError>);
    expect(tokenStorage.get()).toBeNull();
  });

  it("reports network failures with a typed error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(apiRequest("/projects")).rejects.toBeInstanceOf(NetworkError);
  });
});
