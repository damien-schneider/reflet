import { afterEach, describe, expect, it, vi } from "vitest";
import { startConsoleRecorder } from "../console-recorder";

const recorders: Array<{ stop: () => void }> = [];

function record(options?: Parameters<typeof startConsoleRecorder>[0]) {
  const recorder = startConsoleRecorder(options);
  recorders.push(recorder);
  return recorder;
}

afterEach(() => {
  for (const recorder of recorders.splice(0)) {
    recorder.stop();
  }
  vi.restoreAllMocks();
});

describe("startConsoleRecorder", () => {
  it("records console errors without swallowing them", () => {
    const original = vi.spyOn(console, "error").mockImplementation(() => {
      // silence the test output
    });
    const recorder = record();

    console.error("boom", 42);

    expect(recorder.events()).toEqual([
      { level: "error", message: "boom 42", timestamp: expect.any(Number) },
    ]);
    expect(original).toHaveBeenCalledWith("boom", 42);
  });

  it("records warnings at the warn level", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {
      // silence the test output
    });
    const recorder = record();

    console.warn("deprecated");

    expect(recorder.events()[0]?.level).toBe("warn");
  });

  it("serializes errors to their message", () => {
    vi.spyOn(console, "error").mockImplementation(() => {
      // silence the test output
    });
    const recorder = record();

    console.error(new TypeError("cannot read x"));

    expect(recorder.events()[0]?.message).toBe("TypeError: cannot read x");
  });

  it("serializes plain objects and survives circular references", () => {
    vi.spyOn(console, "error").mockImplementation(() => {
      // silence the test output
    });
    const recorder = record();
    const circular: Record<string, unknown> = { id: 1 };
    circular.self = circular;

    console.error({ ok: false }, circular);

    expect(recorder.events()[0]?.message).toContain('{"ok":false}');
    expect(recorder.events()[0]?.message).toContain("[unserializable]");
  });

  it("keeps only the most recent events", () => {
    vi.spyOn(console, "error").mockImplementation(() => {
      // silence the test output
    });
    const recorder = record({ limit: 2 });

    console.error("one");
    console.error("two");
    console.error("three");

    expect(recorder.events().map((event) => event.message)).toEqual([
      "two",
      "three",
    ]);
  });

  it("truncates very long messages", () => {
    vi.spyOn(console, "error").mockImplementation(() => {
      // silence the test output
    });
    const recorder = record();

    console.error("x".repeat(5000));

    expect(recorder.events()[0]?.message.length).toBeLessThanOrEqual(1000);
  });

  it("captures uncaught errors reported on the window", () => {
    const recorder = record();

    window.dispatchEvent(new ErrorEvent("error", { message: "Uncaught boom" }));

    expect(recorder.events()[0]?.message).toContain("Uncaught boom");
  });

  it("restores the original console methods on stop", () => {
    const before = console.error;
    const recorder = record();

    expect(console.error).not.toBe(before);
    recorder.stop();

    expect(console.error).toBe(before);
  });

  it("stops recording after stop", () => {
    vi.spyOn(console, "error").mockImplementation(() => {
      // silence the test output
    });
    const recorder = record();

    recorder.stop();
    console.error("late");

    expect(recorder.events()).toEqual([]);
  });
});
