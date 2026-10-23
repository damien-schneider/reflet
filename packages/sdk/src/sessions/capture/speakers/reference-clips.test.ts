import { describe, expect, it } from "vitest";
import type { SpeechChunk } from "../audio/speech-chunker";
import { ReferenceClips, referencePiece } from "./reference-clips";

const SAMPLES_PER_MS = 16;

function chunkOf(startMs: number, durationMs: number): SpeechChunk {
  return {
    endMs: startMs + durationMs,
    samples: Float32Array.from(
      { length: durationMs * SAMPLES_PER_MS },
      (_, index) => index
    ),
    startMs,
  };
}

function decodedWavSamples(base64: string): number {
  return (atob(base64).length - 44) / 2;
}

describe("referencePiece", () => {
  it("takes the turn's audio up to just before its last words", () => {
    const chunk = chunkOf(10_000, 8000);
    const piece = referencePiece(chunk, {
      endMs: 12_750,
      speaker: "S1",
      startMs: 11_000,
    });
    expect(piece?.length).toBe(1500 * SAMPLES_PER_MS);
    expect(piece?.[0]).toBe(1000 * SAMPLES_PER_MS);
  });

  it("takes only the part of a long turn that lies in the speech piece", () => {
    const piece = referencePiece(chunkOf(10_000, 4000), {
      endMs: 20_000,
      speaker: "S1",
      startMs: 8000,
    });
    expect(piece?.length).toBe(4000 * SAMPLES_PER_MS);
    expect(piece?.[0]).toBe(0);
  });

  it("skips a turn too short to hold a voice", () => {
    expect(
      referencePiece(chunkOf(0, 8000), {
        endMs: 2200,
        speaker: "S1",
        startMs: 1000,
      })
    ).toBeNull();
  });
});

describe("ReferenceClips", () => {
  it("joins short turns of the same voice until it is long enough to recognise", () => {
    const clips = new ReferenceClips({});
    const chunk = chunkOf(0, 20_000);
    expect(
      clips.keepFrom(chunk, [
        { endMs: 2750, speaker: "S1", startMs: 1000 },
        { endMs: 5250, speaker: "S2", startMs: 3000 },
      ])
    ).toBe(false);
    expect(clips.references()).toEqual({});

    expect(
      clips.keepFrom(chunk, [{ endMs: 8250, speaker: "S1", startMs: 6000 }])
    ).toBe(true);
    const references = clips.references();
    expect(Object.keys(references)).toEqual(["S1"]);
    expect(atob(references.S1 ?? "").startsWith("RIFF")).toBe(true);
    expect(decodedWavSamples(references.S1 ?? "")).toBe(3500 * SAMPLES_PER_MS);
  });

  it("offers a voice saved before a reload as it was, without collecting it again", () => {
    const clips = new ReferenceClips({ S1: "UklGRsaved" });
    const chunk = chunkOf(0, 20_000);
    expect(
      clips.keepFrom(chunk, [
        { endMs: 5250, speaker: "S1", startMs: 1000 },
        { endMs: 10_250, speaker: "S2", startMs: 6000 },
      ])
    ).toBe(true);
    const references = clips.references();
    expect(references.S1).toBe("UklGRsaved");
    expect(decodedWavSamples(references.S2 ?? "")).toBe(4000 * SAMPLES_PER_MS);
  });

  it("stops collecting a voice at six seconds", () => {
    const clips = new ReferenceClips({});
    const chunk = chunkOf(0, 30_000);
    clips.keepFrom(chunk, [
      { endMs: 5250, speaker: "S1", startMs: 1000 },
      { endMs: 12_250, speaker: "S1", startMs: 6000 },
      { endMs: 20_250, speaker: "S1", startMs: 14_000 },
    ]);
    expect(decodedWavSamples(clips.references().S1 ?? "")).toBe(
      6000 * SAMPLES_PER_MS
    );
  });

  it("offers Mistral at most eight voices", () => {
    const clips = new ReferenceClips({});
    const chunk = chunkOf(0, 40_000);
    clips.keepFrom(
      chunk,
      Array.from({ length: 10 }, (_, index) => ({
        endMs: index * 4000 + 3500,
        speaker: `S${index + 1}`,
        startMs: index * 4000,
      }))
    );
    expect(Object.keys(clips.references())).toEqual([
      "S1",
      "S2",
      "S3",
      "S4",
      "S5",
      "S6",
      "S7",
      "S8",
    ]);
  });
});
