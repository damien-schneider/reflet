import { describe, expect, it } from "vitest";
import { SpeakerTurns, speakerEventMs } from "./speaker-turns";

describe("SpeakerTurns", () => {
  it("joins consecutive events of one voice into a turn and starts another when the voice changes", () => {
    const turns = new SpeakerTurns();
    turns.add("S1", 1000);
    turns.add("S1", 1500);
    turns.add("S2", 2000);
    turns.add("S2", 2600);
    expect(turns.drain()).toEqual([
      { endMs: 1500, speaker: "S1", startMs: 1000 },
      { endMs: 2600, speaker: "S2", startMs: 2000 },
    ]);
  });

  it("drains only what came since the previous drain, continuing an ongoing turn where it stopped", () => {
    const turns = new SpeakerTurns();
    turns.add("S1", 1000);
    turns.add("S1", 1500);
    expect(turns.drain()).toEqual([
      { endMs: 1500, speaker: "S1", startMs: 1000 },
    ]);
    expect(turns.drain()).toEqual([]);
    turns.add("S1", 2200);
    turns.add("S2", 3000);
    expect(turns.drain()).toEqual([
      { endMs: 2200, speaker: "S1", startMs: 1500 },
      { endMs: 3000, speaker: "S2", startMs: 3000 },
    ]);
  });

  it("ends a turn when an unlabelled voice speaks", () => {
    const turns = new SpeakerTurns();
    turns.add("S1", 1000);
    turns.add(null, 1500);
    turns.add("S1", 2000);
    expect(turns.drain()).toEqual([
      { endMs: 1000, speaker: "S1", startMs: 1000 },
      { endMs: 2000, speaker: "S1", startMs: 2000 },
    ]);
  });

  it("hands out every turn overlapping a speech piece and keeps the ones running past it for the next piece", () => {
    const turns = new SpeakerTurns();
    turns.add("S1", 500);
    turns.add("S1", 1500);
    turns.add("S2", 2000);
    turns.add("S2", 7000);
    turns.add("S1", 9000);
    expect(turns.takeTurnsOverlapping({ endMs: 4000, startMs: 1000 })).toEqual([
      { endMs: 1500, speaker: "S1", startMs: 500 },
      { endMs: 7000, speaker: "S2", startMs: 2000 },
    ]);
    expect(turns.takeTurnsOverlapping({ endMs: 8000, startMs: 4000 })).toEqual([
      { endMs: 7000, speaker: "S2", startMs: 2000 },
    ]);
    expect(turns.takeTurnsOverlapping({ endMs: 9500, startMs: 8000 })).toEqual([
      { endMs: 9000, speaker: "S1", startMs: 9000 },
    ]);
  });
});

describe("speakerEventMs", () => {
  it("dates an event by the audio sent so far minus Mistral's streaming delay", () => {
    expect(
      speakerEventMs({
        runStartMs: 10_000,
        samplesSent: 48_000,
        streamStartSample: 0,
      })
    ).toBe(10_000 + 3000 - 480 - 250);
  });

  it("never dates an event before its stream started", () => {
    expect(
      speakerEventMs({
        runStartMs: 10_000,
        samplesSent: 8000,
        streamStartSample: 0,
      })
    ).toBe(10_000);
    expect(
      speakerEventMs({
        runStartMs: 10_000,
        samplesSent: 32_000,
        streamStartSample: 24_000,
      })
    ).toBe(11_500);
  });
});
