import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toId } from "@/lib/convex-helpers";
import { useAutoSaveRelease } from "./use-auto-save-release";

const createRelease = vi.fn();
const updateRelease = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (reference: string) =>
    reference === "create" ? createRelease : updateRelease,
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: { changelog: { mutations: { create: "create", update: "update" } } },
}));

vi.mock("@ctrl-ui/react/ui/toast", () => ({ toast: { error: vi.fn() } }));

const organizationId = toId("organizations", "org_1");

function renderAutoSave(initial: { title: string; version: string }) {
  return renderHook(
    (draft) =>
      useAutoSaveRelease({
        description: "",
        initialReleaseId: null,
        organizationId,
        ...draft,
      }),
    { initialProps: initial }
  );
}

describe("useAutoSaveRelease", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    createRelease.mockResolvedValue(toId("releases", "rel_1"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("does not create a draft when only the suggested version arrives", async () => {
    const { rerender } = renderAutoSave({ title: "", version: "" });
    rerender({ title: "", version: "v1.2.0" });
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(createRelease).not.toHaveBeenCalled();
  });

  it("creates the draft once the user writes a title", async () => {
    const { rerender } = renderAutoSave({ title: "", version: "v1.2.0" });
    rerender({ title: "Faster search", version: "v1.2.0" });
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(createRelease).toHaveBeenCalledWith({
      description: undefined,
      organizationId,
      title: "Faster search",
      version: "v1.2.0",
    });
  });
});
