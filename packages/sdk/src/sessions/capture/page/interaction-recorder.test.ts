import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionEvent } from "../../protocol";
import { startInteractionRecorder } from "./interaction-recorder";

function startRecording() {
  const events: SessionEvent[] = [];
  const recorder = startInteractionRecorder({
    atMs: () => 1234,
    includeSource: false,
    onEvent: (event) => events.push(event),
  });
  return { events, recorder };
}

function byId(id: string): Element {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing #${id}`);
  }
  return element;
}

function pointAt(target: Element, kind = "pointermove") {
  target.dispatchEvent(
    new MouseEvent(kind, { bubbles: true, clientX: 12, clientY: 34 })
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = `
    <article class="card"><button id="save"><span id="inner">Save</span></button></article>
    <div data-reflet-widget><button id="widget">Mark</button></div>
    <input id="field" value="hunter2" />
    <div id="editor" contenteditable="true">my secret draft</div>`;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("startInteractionRecorder", () => {
  it("records the closest interactive element of a click with its frame", () => {
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 420,
    });
    const { events, recorder } = startRecording();
    pointAt(byId("inner"), "click");
    recorder.stop();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      atMs: 1234,
      element: { label: 'button "Save"', role: "button", selector: "#save" },
      frame: { scrollY: 420 },
      kind: "click",
      pointer: { x: 12, y: 34 },
    });
  });

  it("ignores events from the Reflet widget", () => {
    const { events, recorder } = startRecording();
    pointAt(byId("widget"), "click");
    pointAt(byId("widget"));
    vi.advanceTimersByTime(2000);
    recorder.stop();
    expect(events).toEqual([]);
  });

  it("emits one dwell once the pointer rests 700 ms on an element", () => {
    const { events, recorder } = startRecording();
    const button = byId("inner");
    pointAt(button);
    vi.advanceTimersByTime(699);
    expect(events).toEqual([]);
    vi.advanceTimersByTime(1);
    vi.advanceTimersByTime(200);
    pointAt(button);
    vi.advanceTimersByTime(2000);
    recorder.stop();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ durationMs: 700, kind: "dwell" });
  });

  it("debounces scrolling into one event", () => {
    const { events, recorder } = startRecording();
    for (let step = 0; step < 5; step += 1) {
      window.dispatchEvent(new Event("scroll"));
      vi.advanceTimersByTime(100);
    }
    expect(events).toEqual([]);
    vi.advanceTimersByTime(400);
    recorder.stop();
    expect(events).toEqual([expect.objectContaining({ kind: "scroll" })]);
  });

  it("removes every listener and timer on stop", () => {
    const signals: AbortSignal[] = [];
    const remember = (
      _type: string,
      _listener: unknown,
      options?: boolean | AddEventListenerOptions
    ) => {
      if (typeof options === "object" && options.signal) {
        signals.push(options.signal);
      }
    };
    vi.spyOn(document, "addEventListener").mockImplementation(remember);
    vi.spyOn(window, "addEventListener").mockImplementation(remember);
    const { recorder } = startRecording();
    const registered =
      vi.mocked(document.addEventListener).mock.calls.length +
      vi.mocked(window.addEventListener).mock.calls.length;
    expect(signals).toHaveLength(registered);
    recorder.stop();
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it("records nothing after stop, even from a pending dwell", () => {
    const { events, recorder } = startRecording();
    pointAt(byId("inner"));
    window.dispatchEvent(new Event("scroll"));
    recorder.stop();
    vi.advanceTimersByTime(5000);
    pointAt(byId("inner"), "click");
    expect(events).toEqual([]);
  });

  it("never reads what the user typed", () => {
    const { events, recorder } = startRecording();
    pointAt(byId("field"), "click");
    pointAt(byId("editor"), "click");
    recorder.stop();
    expect(events).toHaveLength(2);
    const recorded = JSON.stringify(events);
    expect(recorded).not.toContain("hunter2");
    expect(recorded).not.toContain("secret");
  });
});
