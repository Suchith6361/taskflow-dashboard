import { afterEach, describe, expect, it, vi } from "vitest";
import { projectService } from "./projectService";

afterEach(() => vi.unstubAllGlobals());

describe("projectService API", () => {
  it("normalizes project IDs and nullable descriptions from the API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: [
            {
              id: 12,
              name: "Plan",
              description: null,
              createdAt: "2026-01-01T00:00:00.000Z",
              taskCount: "3",
              completedTaskCount: "2",
              progress: "67",
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(projectService.list()).resolves.toEqual([
      {
        id: "12",
        name: "Plan",
        description: "",
        createdAt: "2026-01-01T00:00:00.000Z",
        totalTasks: 3,
        completedTasks: 2,
        progress: 67,
      },
    ]);
  });

  it("sends create and delete requests to the project endpoints", async () => {
    const project = {
      id: 12,
      name: "Plan",
      description: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { project } }), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { deleted: true } }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(projectService.create({ name: "Plan", description: "" })).resolves.toMatchObject({
      id: "12",
      description: "",
    });
    await expect(projectService.remove("12")).resolves.toBeUndefined();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/projects");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("DELETE");
  });
});
