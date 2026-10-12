import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Frame, SessionEvent } from "../../protocol";
import { createEventBatcher } from "./event-batcher";

const FRAME: Frame = {
  devicePixelRatio: 1,
  scrollX: 0,
  scrollY: 0,
  title: null,
  url: "https://app.test/",
  viewportHeight: 800,
  viewportWidth: 1200,
};

function scroll(atMs: number): SessionEvent {
  return { atMs, kind: "scroll", scrollX: 0, scrollY: atMs };
}

function mark(atMs: number) {
  return {
    atMs,
    element: null,
    evidenceClientKey: null,
    frame: FRAME,
    kind: "mark" as const,
    note: null,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createEventBatcher", () => {
  it("sends a batch every few seconds, or as soon as it is full", () => {
    const onBatch = vi.fn();
    const batcher = createEventBatcher({ maxBatchEvents: 3, onBatch });
    batcher.add(scroll(1));
    expect(onBatch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(onBatch).toHaveBeenLastCalledWith([scroll(1)]);
    batcher.add(scroll(2));
    batcher.add(scroll(3));
    batcher.add(scroll(4));
    expect(onBatch).toHaveBeenLastCalledWith([scroll(2), scroll(3), scroll(4)]);
    batcher.stop();
  });

  it("holds a mark until its note is written", () => {
    const onBatch = vi.fn();
    const batcher = createEventBatcher({ maxBatchEvents: 100, onBatch });
    batcher.hold("m1", mark(10));
    vi.advanceTimersByTime(5000);
    expect(onBatch).not.toHaveBeenCalled();
    batcher.annotate("m1", "Total is wrong");
    vi.advanceTimersByTime(5000);
    expect(onBatch).toHaveBeenCalledWith([
      { ...mark(10), note: "Total is wrong" },
    ]);
    batcher.stop();
  });

  it("lets go of an unannotated mark at the next mark, on flushAll, or after a minute", () => {
    const onBatch = vi.fn();
    const batcher = createEventBatcher({ maxBatchEvents: 100, onBatch });
    batcher.hold("m1", mark(1));
    batcher.hold("m2", mark(2));
    batcher.flush();
    expect(onBatch).toHaveBeenLastCalledWith([mark(1)]);
    batcher.flushAll();
    expect(onBatch).toHaveBeenLastCalledWith([mark(2)]);
    batcher.hold("m3", mark(3));
    vi.advanceTimersByTime(65_000);
    expect(onBatch).toHaveBeenLastCalledWith([mark(3)]);
    batcher.stop();
  });
});
