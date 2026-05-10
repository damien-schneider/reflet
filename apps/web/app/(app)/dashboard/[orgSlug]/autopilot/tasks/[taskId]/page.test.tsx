import { describe, expect, it, vi } from "vitest";

const mockRedirect = vi.fn((_url: string): never => {
  throw new Error("NEXT_REDIRECT");
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

describe("Legacy autopilot task detail redirect", () => {
  it("redirects to the canonical /tasks/[taskId] route", async () => {
    const { default: LegacyTaskDetailRedirect } = await import("./page");

    await expect(
      LegacyTaskDetailRedirect({
        params: Promise.resolve({ orgSlug: "acme", taskId: "a".repeat(32) }),
      })
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith(
      `/dashboard/acme/tasks/${"a".repeat(32)}`
    );
  });
});
