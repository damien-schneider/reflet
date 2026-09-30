import type { Id } from "@reflet/backend/convex/_generated/dataModel";
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
const existingReleaseId = toId("releases", "rel_existing");

interface EditorState {
  title: string;
  userVersion: string | null;
  version: string;
}

function renderAutoSave(
  initial: EditorState,
  initialReleaseId: Id<"releases"> | null = null
) {
  return renderHook(
    (state: EditorState) =>
      useAutoSaveRelease({
        description: "",
        initialReleaseId,
        organizationId,
        ...state,
      }),
    { initialProps: initial }
  );
}

const flushDebounce = () => act(() => vi.advanceTimersByTimeAsync(1000));

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
    const { rerender } = renderAutoSave({
      title: "",
      userVersion: null,
      version: "",
    });
    rerender({ title: "", userVersion: null, version: "v1.2.0" });
    await flushDebounce();
    expect(createRelease).not.toHaveBeenCalled();
  });

  it("does not write a suggested version into an opened unversioned draft", async () => {
    const { rerender } = renderAutoSave(
      { title: "Faster search", userVersion: null, version: "" },
      existingReleaseId
    );
    rerender({ title: "Faster search", userVersion: null, version: "v1.2.0" });
    await flushDebounce();
    expect(updateRelease).not.toHaveBeenCalled();
  });

  it("creates the draft with the suggested version once the user writes a title", async () => {
    const { rerender } = renderAutoSave({
      title: "",
      userVersion: null,
      version: "v1.2.0",
    });
    rerender({ title: "Faster search", userVersion: null, version: "v1.2.0" });
    await flushDebounce();
    expect(createRelease).toHaveBeenCalledWith({
      description: undefined,
      organizationId,
      title: "Faster search",
      version: "v1.2.0",
    });
  });

  it("saves a version the user picks on its own", async () => {
    const { rerender } = renderAutoSave(
      { title: "", userVersion: null, version: "v1.2.0" },
      existingReleaseId
    );
    rerender({ title: "", userVersion: "v2.0.0", version: "v2.0.0" });
    await flushDebounce();
    expect(updateRelease).toHaveBeenCalledWith({
      description: undefined,
      id: existingReleaseId,
      title: "Untitled release",
      version: "v2.0.0",
    });
  });
});
