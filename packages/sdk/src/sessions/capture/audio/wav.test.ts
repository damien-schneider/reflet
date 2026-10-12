import { describe, expect, it } from "vitest";
import { createDownsampler, encodeWav, maxWavDurationMs } from "./wav";

function readText(view: DataView, offset: number, length: number): string {
  return String.fromCharCode(
    ...Array.from({ length }, (_, index) => view.getUint8(offset + index))
  );
}

describe("encodeWav", () => {
  it("writes a 16 kHz mono 16-bit RIFF header", () => {
    const view = new DataView(encodeWav(new Float32Array(160), 16_000));
    expect(readText(view, 0, 4)).toBe("RIFF");
    expect(view.getUint32(4, true)).toBe(36 + 320);
    expect(readText(view, 8, 8)).toBe("WAVEfmt ");
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16_000);
    expect(view.getUint32(28, true)).toBe(32_000);
    expect(view.getUint16(32, true)).toBe(2);
    expect(view.getUint16(34, true)).toBe(16);
    expect(readText(view, 36, 4)).toBe("data");
    expect(view.getUint32(40, true)).toBe(320);
    expect(view.byteLength).toBe(44 + 320);
  });

  it("clamps samples outside -1..1", () => {
    const view = new DataView(
      encodeWav(Float32Array.from([2, -3, 0.5]), 16_000)
    );
    expect(view.getInt16(44, true)).toBe(32_767);
    expect(view.getInt16(46, true)).toBe(-32_768);
    expect(view.getInt16(48, true)).toBe(Math.round(0.5 * 32_767));
  });

  it("caps a segment so its WAV file stays under the byte limit", () => {
    const maxBytes = 1_000_000;
    const samples = (maxWavDurationMs(maxBytes) * 16_000) / 1000;
    const bytes = encodeWav(new Float32Array(samples), 16_000).byteLength;
    expect(bytes).toBeLessThanOrEqual(maxBytes);
    expect(bytes).toBeGreaterThan(maxBytes - 32);
  });
});

describe("createDownsampler", () => {
  it("divides an integer rate by averaging", () => {
    const downsample = createDownsampler(48_000);
    const output = downsample(new Float32Array(4800).fill(0.5));
    expect(output).toHaveLength(1600);
    expect(output.every((sample) => Math.abs(sample - 0.5) < 1e-6)).toBe(true);
  });

  it("keeps the fractional position across frames", () => {
    const downsample = createDownsampler(44_100);
    let total = 0;
    for (let frame = 0; frame < 100; frame += 1) {
      total += downsample(new Float32Array(441).fill(0.2)).length;
    }
    expect(Math.abs(total - 16_000)).toBeLessThanOrEqual(1);
  });

  it("passes 16 kHz audio through", () => {
    const frame = Float32Array.from([0.1, 0.2, 0.3]);
    expect(Array.from(createDownsampler(16_000)(frame))).toEqual(
      Array.from(frame)
    );
  });

  it("refuses a rate it cannot downsample", () => {
    expect(() => createDownsampler(8000)).toThrow();
  });
});
