import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureViewport } from "../../../feedback/core/capture";
import type { CapturedImage } from "../../../feedback/types";
import { blankFieldValues } from "../blank-fields";
import { SESSION_MASK_SELECTORS } from "../element-ref";
import {
  type CapturedEvidence,
  createEvidenceScheduler,
} from "./evidence-scheduler";

vi.mock("../../../feedback/core/capture", () => ({
  captureViewport: vi.fn(),
  releaseCapture: vi.fn(),
}));

const LIMITS = {
  maxEvidence: 3,
  maxImageBytes: 1000,
  minAutoCaptureIntervalMs: 10_000,
};

function screenshot(bytes = 100): CapturedImage {
  return {
    blob: new Blob([new Uint8Array(bytes)], { type: "image/png" }),
    height: 600,
    mimeType: "image/png",
    objectUrl: "blob:shot",
    width: 800,
  };
}

function startScheduler(limits = LIMITS) {
  const evidence: CapturedEvidence[] = [];
  const scheduler = createEvidenceScheduler({
    atMs: () => Date.now(),
    includeSource: false,
    limits,
    onEvidence: (captured) => evidence.push(captured),
  });
  return { evidence, scheduler };
}

beforeEach(() => {
  vi.useFakeTimers({ now: 0 });
  vi.mocked(captureViewport).mockResolvedValue(screenshot());
});

afterEach(() => {
  vi.useRealTimers();
  vi.mocked(captureViewport).mockReset();
});

describe("createEvidenceScheduler", () => {
  it("captures a masked screenshot for an explicit trigger", async () => {
    const { evidence, scheduler } = startScheduler();
    const clientKey = scheduler.capture({ note: "Here", trigger: "mark" });
    await vi.runAllTimersAsync();
    expect(captureViewport).toHaveBeenCalledWith({
      excludeSelectors: SESSION_MASK_SELECTORS,
      prepareClone: blankFieldValues,
    });
    expect(evidence).toEqual([
      expect.objectContaining({
        clientKey,
        image: expect.objectContaining({ height: 600, width: 800 }),
        missingReason: null,
        note: "Here",
        trigger: "mark",
      }),
    ]);
  });

  it("captures the page 1.5 s after the last navigation", async () => {
    const { evidence, scheduler } = startScheduler();
    scheduler.navigated();
    await vi.advanceTimersByTimeAsync(1000);
    scheduler.navigated();
    await vi.advanceTimersByTimeAsync(1499);
    expect(captureViewport).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(evidence).toEqual([
      expect.objectContaining({ atMs: 2500, trigger: "navigation" }),
    ]);
  });

  it("reports the frame and time the screenshot was rendered, not requested", async () => {
    let finishRender: (image: CapturedImage) => void = () => undefined;
    const rendering = new Promise<CapturedImage>((resolve) => {
      finishRender = resolve;
    });
    vi.mocked(captureViewport).mockReturnValueOnce(rendering);
    const { evidence, scheduler } = startScheduler();
    scheduler.capture({ trigger: "mark" });
    await vi.advanceTimersByTimeAsync(3200);
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 480,
    });
    finishRender(screenshot());
    await vi.runAllTimersAsync();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    expect(evidence).toEqual([
      expect.objectContaining({
        atMs: 0,
        capturedAtMs: 3200,
        frame: expect.objectContaining({ scrollY: 480 }),
      }),
    ]);
  });

  it("skips an automatic capture too close to the previous one", async () => {
    const { evidence, scheduler } = startScheduler();
    scheduler.capture({ trigger: "start" });
    scheduler.navigated();
    await vi.advanceTimersByTimeAsync(5000);
    expect(evidence.map((item) => item.trigger)).toEqual(["start"]);
    await vi.advanceTimersByTimeAsync(10_000);
    scheduler.navigated();
    await vi.advanceTimersByTimeAsync(1500);
    expect(evidence.map((item) => item.trigger)).toEqual([
      "start",
      "navigation",
    ]);
  });

  it("records a missing capture with its reason", async () => {
    vi.mocked(captureViewport)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(screenshot(5000));
    const { evidence, scheduler } = startScheduler();
    scheduler.capture({ trigger: "start" });
    scheduler.capture({ trigger: "mark" });
    await vi.runAllTimersAsync();
    expect(evidence).toEqual([
      expect.objectContaining({
        image: null,
        missingReason: expect.any(String),
      }),
      expect.objectContaining({
        image: null,
        missingReason: expect.any(String),
      }),
    ]);
  });

  it("stops capturing at the evidence limit", () => {
    const { scheduler } = startScheduler({ ...LIMITS, maxEvidence: 1 });
    expect(scheduler.capture({ trigger: "start" })).toEqual(expect.any(String));
    expect(scheduler.capture({ trigger: "mark" })).toBeNull();
  });

  it("drops a pending navigation capture when cancelled", async () => {
    const { evidence, scheduler } = startScheduler();
    scheduler.navigated();
    scheduler.cancelPending();
    await vi.advanceTimersByTimeAsync(5000);
    expect(evidence).toEqual([]);
  });

  it("keeps no screenshot that finishes after collection stops", async () => {
    let finishFirstShot: (image: CapturedImage) => void = () => undefined;
    const firstShot = new Promise<CapturedImage>((resolve) => {
      finishFirstShot = resolve;
    });
    vi.mocked(captureViewport).mockReturnValueOnce(firstShot);
    const { evidence, scheduler } = startScheduler();
    scheduler.capture({ trigger: "start" });
    await vi.advanceTimersByTimeAsync(0);
    const queuedKey = scheduler.capture({ trigger: "mark" });

    scheduler.cancelPending();
    finishFirstShot(screenshot());
    await vi.runAllTimersAsync();

    expect(captureViewport).toHaveBeenCalledTimes(1);
    expect(evidence.map(({ image }) => image !== null)).toEqual([false, false]);
    expect(evidence).toEqual([
      expect.objectContaining({
        missingReason: "Recording stopped before the screenshot was taken.",
      }),
      expect.objectContaining({
        clientKey: queuedKey,
        missingReason: "Recording stopped before the screenshot was taken.",
      }),
    ]);
  });
});
