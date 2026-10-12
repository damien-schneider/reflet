import { describe, expect, it } from "vitest";
import { createSessionClock } from "./session-clock";

function manualTime(start: number) {
  let current = start;
  return {
    readTime: () => current,
    set: (value: number) => {
      current = value;
    },
  };
}

describe("createSessionClock", () => {
  it("counts milliseconds from the session start and never goes back", () => {
    const time = manualTime(10_000);
    const clock = createSessionClock({
      readTime: time.readTime,
      startedAt: 10_000,
    });
    time.set(12_500);
    expect(clock.atMs()).toBe(2500);
    time.set(12_000);
    expect(clock.atMs()).toBe(2500);
  });

  it("excludes pauses from the active time and records them as gaps", () => {
    const time = manualTime(0);
    const clock = createSessionClock({ readTime: time.readTime, startedAt: 0 });
    time.set(1000);
    clock.pause("hidden");
    time.set(4000);
    expect(clock.activeMs()).toBe(1000);
    clock.resume();
    time.set(6000);
    expect(clock.activeMs()).toBe(3000);
    expect(clock.gaps()).toEqual([
      { endMs: 4000, reason: "hidden", startMs: 1000 },
    ]);
  });

  it("restores the gaps of a resumed draft", () => {
    const time = manualTime(20_000);
    const clock = createSessionClock({
      gaps: [{ endMs: 15_000, reason: "interrupted", startMs: 5000 }],
      readTime: time.readTime,
      startedAt: 0,
    });
    expect(clock.activeMs()).toBe(10_000);
  });
});
