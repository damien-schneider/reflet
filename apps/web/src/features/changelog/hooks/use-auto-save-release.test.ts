import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toId } from "@/lib/convex-helpers";
import { useAutoSaveRelease } from "./use-auto-save-release";

const createRelease = vi.fn();
const updateRelease = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (reference: string) =>
    reference === "create" ? createRelease : updateRelease,
  useQuery: () => undefined,
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    changelog: {
      mutations: { create: "create", update: "update" },
      queries: { get: "get" },
    },
  },
}));

vi.mock("@ctrl-ui/react/ui/toast", () => ({ toast: { error: vi.fn() } }));

const organizationId = toId("organizations", "org_1");
const existingReleaseId = toId("releases", "rel_existing");

const existingRelease = (
  fields: Partial<Doc<"releases">> = {}
): Doc<"releases"> => ({
  _creationTime: 0,
  _id: existingReleaseId,
  createdAt: 0,
  description: "Server notes",
  organizationId,
  title: "Faster search",
  updatedAt: 0,
  ...fields,
});

interface HookProps {
  initialRelease?: Doc<"releases">;
  suggestedVersion: string;
}

const renderAutoSave = (initialProps: HookProps) =>
  renderHook(
    (props: HookProps) => useAutoSaveRelease({ ...props, organizationId }),
    { initialProps }
  );

const flushDebounce = () => act(() => vi.advanceTimersByTimeAsync(1000));

describe("useAutoSaveRelease", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    createRelease.mockResolvedValue(toId("releases", "rel_1"));
    updateRelease.mockResolvedValue(existingReleaseId);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("does not create a draft when only the suggested version arrives", async () => {
    const { rerender } = renderAutoSave({ suggestedVersion: "" });
    rerender({ suggestedVersion: "v1.2.0" });
    await flushDebounce();
    expect(createRelease).not.toHaveBeenCalled();
  });

  it("creates the draft with the suggested version once the user writes a title", async () => {
    const { result } = renderAutoSave({ suggestedVersion: "v1.2.0" });
    act(() => result.current.setTitle("Faster search"));
    await flushDebounce();
    expect(createRelease).toHaveBeenCalledWith({
      description: undefined,
      organizationId,
      title: "Faster search",
      version: "v1.2.0",
    });
  });

  it("writes edits typed while the first create is still in flight", async () => {
    const creation = Promise.withResolvers<string>();
    createRelease.mockReturnValue(creation.promise);
    const { result } = renderAutoSave({ suggestedVersion: "" });

    act(() => result.current.setTitle("Fast"));
    await flushDebounce();
    act(() => result.current.setTitle("Faster search"));
    await flushDebounce();
    await act(async () => {
      creation.resolve(existingReleaseId);
      await creation.promise;
    });

    expect(createRelease).toHaveBeenCalledTimes(1);
    expect(updateRelease).toHaveBeenCalledWith({
      description: undefined,
      id: existingReleaseId,
      title: "Faster search",
      version: undefined,
    });
  });

  it("writes only the edited field to an existing release", async () => {
    const { result } = renderAutoSave({
      initialRelease: existingRelease(),
      suggestedVersion: "v1.2.0",
    });
    act(() => result.current.setVersion("v2.0.0"));
    await flushDebounce();
    expect(updateRelease).toHaveBeenCalledWith({
      description: undefined,
      id: existingReleaseId,
      title: undefined,
      version: "v2.0.0",
    });
  });

  it("sends an empty description to clear it", async () => {
    const { result } = renderAutoSave({
      initialRelease: existingRelease(),
      suggestedVersion: "",
    });
    act(() => result.current.setDescription(""));
    await flushDebounce();
    expect(updateRelease).toHaveBeenCalledWith(
      expect.objectContaining({ description: "", id: existingReleaseId })
    );
  });

  it("adopts server text while there are no unsaved edits", () => {
    const { rerender, result } = renderAutoSave({
      initialRelease: existingRelease(),
      suggestedVersion: "",
    });
    rerender({
      initialRelease: existingRelease({ description: "Applied AI notes" }),
      suggestedVersion: "",
    });
    expect(result.current.description).toBe("Applied AI notes");
  });

  it("keeps unsaved local text when the server changes", () => {
    const { rerender, result } = renderAutoSave({
      initialRelease: existingRelease(),
      suggestedVersion: "",
    });
    act(() => result.current.setDescription("My edit"));
    rerender({
      initialRelease: existingRelease({ description: "Someone else" }),
      suggestedVersion: "",
    });
    expect(result.current.description).toBe("My edit");
  });
});
