import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureViewport, releaseCapture } from "../core/capture";
import type { CapturedImage } from "../types";
import { useWidgetState } from "../ui/use-widget-state";

vi.mock("../core/capture", () => ({
  captureViewport: vi.fn(),
  releaseCapture: vi.fn(),
}));

function screenshot(): CapturedImage {
  return {
    blob: new Blob(["image"]),
    height: 600,
    mimeType: "image/png",
    objectUrl: `blob:${crypto.randomUUID()}`,
    width: 800,
  };
}

function mount() {
  return renderHook(() =>
    useWidgetState({ captureOnOpen: false, publicKey: "fb_pub_test" })
  );
}

beforeEach(() => {
  vi.mocked(captureViewport).mockImplementation(async () => screenshot());
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("retaking a screenshot", () => {
  it("clears drawings from the old screenshot only after the replacement succeeds", async () => {
    const { result } = mount();
    act(() => result.current.takeCapture());
    await waitFor(() => expect(result.current.capture).not.toBeNull());
    act(() =>
      result.current.setAnnotations([
        {
          color: "#ef4444",
          end: { x: 50, y: 50 },
          id: "mark",
          start: { x: 0, y: 0 },
          tool: "rectangle",
        },
      ])
    );
    let finishCapture: ((image: CapturedImage | null) => void) | undefined;
    const nextCapture = new Promise<CapturedImage | null>((resolve) => {
      finishCapture = resolve;
    });
    vi.mocked(captureViewport).mockReturnValue(nextCapture);
    const id = result.current.activeScreenshot?.id;
    if (!id) {
      throw new Error("Screenshot missing");
    }
    act(() => result.current.retakeCapture(id));
    expect(result.current.annotations).toHaveLength(1);
    await act(async () => finishCapture?.(screenshot()));
    expect(result.current.annotations).toHaveLength(0);
  });

  it("retains the old screenshot and tells the reporter when retaking fails", async () => {
    const { result } = mount();
    act(() => result.current.takeCapture());
    await waitFor(() => expect(result.current.capture).not.toBeNull());
    const original = result.current.capture;
    vi.mocked(captureViewport).mockResolvedValue(null);
    const id = result.current.activeScreenshot?.id;
    if (!id) {
      throw new Error("Screenshot missing");
    }
    act(() => result.current.retakeCapture(id));
    await waitFor(() => expect(result.current.isCapturing).toBe(false));
    expect(result.current.capture).toBe(original);
    expect(result.current.error).toContain("Screenshot unavailable");
  });

  it("releases a late capture after the reporter cancels the feedback", async () => {
    let finishCapture: ((image: CapturedImage | null) => void) | undefined;
    const nextCapture = new Promise<CapturedImage | null>((resolve) => {
      finishCapture = resolve;
    });
    vi.mocked(captureViewport).mockReturnValue(nextCapture);
    const { result } = mount();
    act(() => result.current.takeCapture());
    act(() => result.current.close());
    const lateCapture = screenshot();
    await act(async () => finishCapture?.(lateCapture));
    expect(result.current.capture).toBeNull();
    expect(releaseCapture).toHaveBeenCalledWith(lateCapture);
  });
});

it("starts with an allowed category when the host omits the default", () => {
  const { result } = renderHook(() =>
    useWidgetState({
      captureOnOpen: false,
      categories: ["idea", "question"],
      publicKey: "fb_pub_test",
    })
  );
  expect(result.current.category).toBe("idea");
  act(() => result.current.setCategory("question"));
  act(() => result.current.close());
  expect(result.current.category).toBe("idea");
});

it("adds a second capture without replacing the first image or its drawing", async () => {
  const { result } = mount();
  act(() => result.current.takeCapture());
  await waitFor(() => expect(result.current.capture).not.toBeNull());
  const first = result.current.capture;
  act(() =>
    result.current.setAnnotations([
      {
        color: "#ef4444",
        end: { x: 50, y: 50 },
        id: "first-mark",
        start: { x: 0, y: 0 },
        tool: "rectangle",
      },
    ])
  );
  act(() => result.current.takeCapture());
  await waitFor(() => expect(result.current.isCapturing).toBe(false));
  expect(result.current.screenshots).toHaveLength(2);
  expect(result.current.screenshots[0]?.image).toBe(first);
  expect(result.current.screenshots[0]?.annotations).toHaveLength(1);
  expect(result.current.screenshots[1]?.annotations).toHaveLength(0);
});

it("removes only the chosen image and releases the others when the draft closes", async () => {
  const { result } = mount();
  act(() => result.current.takeCapture());
  await waitFor(() => expect(result.current.screenshots).toHaveLength(1));
  act(() => result.current.takeCapture());
  await waitFor(() => expect(result.current.screenshots).toHaveLength(2));
  const [first, second] = result.current.screenshots;
  if (!(first && second)) {
    throw new Error("Captures missing");
  }
  act(() => result.current.removeCapture(first.id));
  expect(result.current.screenshots).toEqual([second]);
  expect(releaseCapture).toHaveBeenCalledWith(first.image);
  expect(releaseCapture).not.toHaveBeenCalledWith(second.image);
  act(() => result.current.close());
  expect(result.current.screenshots).toEqual([]);
  expect(releaseCapture).toHaveBeenCalledWith(second.image);
});

it("ignores repeated capture clicks while an image is being taken", async () => {
  const { result } = mount();
  act(() => {
    result.current.takeCapture();
    result.current.takeCapture();
  });
  await waitFor(() => expect(result.current.screenshots).toHaveLength(1));
  expect(captureViewport).toHaveBeenCalledTimes(1);
});
