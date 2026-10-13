import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionEvent } from "../../protocol";
import { startInteractionRecorder } from "./interaction-recorder";

function startRecording(
  onLongHover: (element: Element) => string | null = () => null
) {
  const events: SessionEvent[] = [];
  const recorder = startInteractionRecorder({
    atMs: () => Date.now(),
    includeSource: false,
    onEvent: (event) => events.push(event),
    onLongHover,
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
    new MouseEvent(kind, {
      bubbles: true,
      clientX: 12,
      clientY: 34,
      detail: kind === "click" ? 1 : 0,
    })
  );
}

beforeEach(() => {
  vi.useFakeTimers({ now: 0 });
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
      atMs: 0,
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

  it("stores no pointer for a click made from the keyboard", () => {
    const { events, recorder } = startRecording();
    byId("inner").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    recorder.stop();
    expect(events).toEqual([expect.objectContaining({ pointer: null })]);
  });

  it("records how long the pointer stayed on an element", () => {
    const { events, recorder } = startRecording();
    pointAt(byId("inner"));
    vi.advanceTimersByTime(2400);
    pointAt(byId("editor"));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      atMs: 0,
      durationMs: 2400,
      element: { selector: "#save" },
      kind: "dwell",
      pointer: { x: 12, y: 34 },
    });
    recorder.stop();
  });

  it("drops hovers shorter than 700 ms", () => {
    const { events, recorder } = startRecording();
    pointAt(byId("inner"));
    vi.advanceTimersByTime(600);
    pointAt(byId("editor"));
    expect(events).toEqual([]);
    recorder.stop();
  });

  it("asks for a screenshot once the pointer rests 1.2 s and ties it to the hover", () => {
    const onLongHover = vi.fn((_element: Element) => "shot-1");
    const { events, recorder } = startRecording(onLongHover);
    pointAt(byId("inner"));
    vi.advanceTimersByTime(1199);
    expect(onLongHover).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onLongHover).toHaveBeenCalledWith(byId("save"));
    vi.advanceTimersByTime(800);
    pointAt(byId("editor"));
    expect(events[0]).toMatchObject({
      durationMs: 2000,
      evidenceClientKey: "shot-1",
      kind: "dwell",
    });
    recorder.stop();
  });

  it("asks for no screenshot when the pointer moves on before 1.2 s", () => {
    const onLongHover = vi.fn((_element: Element) => "shot-1");
    const { events, recorder } = startRecording(onLongHover);
    pointAt(byId("inner"));
    vi.advanceTimersByTime(900);
    pointAt(byId("editor"));
    vi.advanceTimersByTime(400);
    recorder.stop();
    expect(onLongHover).not.toHaveBeenCalled();
    expect(events[0]).not.toHaveProperty("evidenceClientKey");
  });

  it("emits a hover still in progress when recording stops", () => {
    const { events, recorder } = startRecording();
    pointAt(byId("inner"));
    vi.advanceTimersByTime(1500);
    recorder.stop();
    expect(events).toEqual([
      expect.objectContaining({ durationMs: 1500, kind: "dwell" }),
    ]);
  });

  it("ends a hover when the pointer leaves the window", () => {
    const { events, recorder } = startRecording();
    pointAt(byId("inner"));
    vi.advanceTimersByTime(900);
    byId("inner").dispatchEvent(
      new MouseEvent("pointerout", { bubbles: true, relatedTarget: null })
    );
    vi.advanceTimersByTime(3000);
    recorder.stop();
    expect(events).toEqual([
      expect.objectContaining({ durationMs: 900, kind: "dwell" }),
    ]);
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
