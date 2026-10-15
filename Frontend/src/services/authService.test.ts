import { afterEach, describe, expect, it, vi } from "vitest";
import { authService } from "./authService";
import { tokenStorage } from "./apiClient";

afterEach(() => {
  vi.unstubAllGlobals();
  authService.logout();
  localStorage.clear();
});

const response = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data }), { status: 200 });

describe("authService", () => {
  it("registers, stores the bearer token, and never stores the password", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        response({ user: { id: 7, name: "Ava", email: "ava@example.com" }, token: "jwt" }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(authService.register("Ava", "ava@example.com", "password123")).resolves.toEqual({
      id: "7",
      name: "Ava",
      email: "ava@example.com",
    });
    expect(JSON.parse(localStorage.getItem("taskflow-auth-user") || "{}")).toEqual({
      id: "7",
      name: "Ava",
      email: "ava@example.com",
    });
    expect(tokenStorage.get()).toBe("jwt");
    expect(localStorage.getItem("taskflow-auth-user")).not.toContain("password123");
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/auth/register");
  });

  it("logs in and restores the user from /auth/me", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response({ user: { id: 9, name: "Sam", email: "sam@example.com" }, token: "jwt" }),
      )
      .mockResolvedValueOnce(
        response({ user: { id: 9, name: "Samuel", email: "sam@example.com" } }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await authService.login("sam@example.com", "password123");
    localStorage.removeItem("taskflow-auth-user");
    await expect(authService.restoreSession()).resolves.toEqual({
      id: "9",
      name: "Samuel",
      email: "sam@example.com",
    });
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/auth/login");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/auth/me");
  });
});
