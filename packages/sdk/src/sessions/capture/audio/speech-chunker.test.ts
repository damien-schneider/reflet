import { describe, expect, it } from "vitest";
import { createSpeechChunker, type SpeechChunk } from "./speech-chunker";

const RATE = 16_000;
const SAMPLES_PER_MS = RATE / 1000;
const WINDOW_TOLERANCE_MS = 30;

function silence(ms: number): Float32Array {
  return new Float32Array(ms * SAMPLES_PER_MS);
}

function tone(ms: number): Float32Array {
  return Float32Array.from(
    { length: ms * SAMPLES_PER_MS },
    (_, index) => 0.3 * Math.sin((2 * Math.PI * 220 * index) / RATE)
  );
}

function record(
  parts: Float32Array[],
  options: { maxSegmentMs?: number; startMs?: number } = {}
) {
  const chunks: SpeechChunk[] = [];
  const chunker = createSpeechChunker({
    maxSegmentMs: options.maxSegmentMs ?? 30_000,
    onChunk: (chunk) => chunks.push(chunk),
    startMs: options.startMs ?? 0,
  });
  for (const part of parts) {
    for (let offset = 0; offset < part.length; offset += 1000) {
      chunker.push(part.subarray(offset, offset + 1000));
    }
  }
  return { chunker, chunks };
}

describe("createSpeechChunker", () => {
  it("emits nothing for silence", () => {
    const { chunker, chunks } = record([silence(5000)]);
    chunker.flush();
    expect(chunks).toEqual([]);
  });

  it("emits one utterance with 300 ms of pre-roll on the session clock", () => {
    const { chunks } = record([silence(1000), tone(2000), silence(2000)], {
      startMs: 5000,
    });
    expect(chunks).toHaveLength(1);
    const [chunk] = chunks;
    expect(Math.abs((chunk?.startMs ?? 0) - 5700)).toBeLessThanOrEqual(
      WINDOW_TOLERANCE_MS
    );
    expect(chunk?.endMs).toBeGreaterThanOrEqual(8000);
    expect(chunk?.endMs).toBeLessThanOrEqual(8000 + 300 + WINDOW_TOLERANCE_MS);
    expect(chunk?.samples.length).toBe(
      ((chunk?.endMs ?? 0) - (chunk?.startMs ?? 0)) * SAMPLES_PER_MS
    );
  });

  it("splits long speech at the maximum segment length", () => {
    const { chunker, chunks } = record([tone(5000)], { maxSegmentMs: 2000 });
    chunker.flush();
    expect(chunks.length).toBe(3);
    for (const chunk of chunks) {
      expect(chunk.endMs - chunk.startMs).toBeLessThanOrEqual(2000);
    }
    expect(chunks.at(-1)?.endMs).toBe(5000);
  });

  it("drops a blip shorter than 400 ms of speech", () => {
    const { chunker, chunks } = record([
      silence(1000),
      tone(200),
      silence(3000),
    ]);
    chunker.flush();
    expect(chunks).toEqual([]);
  });

  it("flushes the utterance in progress", () => {
    const { chunker, chunks } = record([silence(500), tone(1000)]);
    expect(chunks).toEqual([]);
    chunker.flush();
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.endMs).toBe(1500);
  });
});
