import { SPEECH_SAMPLE_RATE } from "./speech-chunker";

const WAV_HEADER_BYTES = 44;
const BYTES_PER_SAMPLE = 2;
const MAX_POSITIVE_SAMPLE = 0x7f_ff;
const MAX_NEGATIVE_SAMPLE = 0x80_00;

function writeText(view: DataView, offset: number, text: string): void {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}

function writePcm16(
  view: DataView,
  offset: number,
  samples: Float32Array
): void {
  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    const scale = clamped < 0 ? MAX_NEGATIVE_SAMPLE : MAX_POSITIVE_SAMPLE;
    view.setInt16(
      offset + index * BYTES_PER_SAMPLE,
      Math.round(clamped * scale),
      true
    );
  });
}

export function encodePcm16(samples: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(samples.length * BYTES_PER_SAMPLE);
  writePcm16(new DataView(buffer), 0, samples);
  return buffer;
}

/** 16-bit mono PCM WAV, the format the transcription endpoint expects. */
export function encodeWav(
  samples: Float32Array,
  sampleRate: number
): ArrayBuffer {
  const dataBytes = samples.length * BYTES_PER_SAMPLE;
  const buffer = new ArrayBuffer(WAV_HEADER_BYTES + dataBytes);
  const view = new DataView(buffer);
  writeText(view, 0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeText(view, 8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * BYTES_PER_SAMPLE, true);
  view.setUint16(32, BYTES_PER_SAMPLE, true);
  view.setUint16(34, 16, true);
  writeText(view, 36, "data");
  view.setUint32(40, dataBytes, true);
  writePcm16(view, WAV_HEADER_BYTES, samples);
  return buffer;
}

export function maxWavDurationMs(maxBytes: number): number {
  const bytesPerMs = (SPEECH_SAMPLE_RATE / 1000) * BYTES_PER_SAMPLE;
  return Math.floor((maxBytes - WAV_HEADER_BYTES) / bytesPerMs);
}

export function createDownsampler(
  inputRate: number
): (frame: Float32Array) => Float32Array {
  if (inputRate < SPEECH_SAMPLE_RATE) {
    throw new Error(`Cannot record speech from a ${inputRate} Hz microphone.`);
  }
  const ratio = inputRate / SPEECH_SAMPLE_RATE;
  let carry = new Float32Array(0);
  let offset = 0;

  return (frame) => {
    const input = new Float32Array(carry.length + frame.length);
    input.set(carry);
    input.set(frame, carry.length);
    const count = Math.floor((input.length - offset) / ratio);
    const output = new Float32Array(count);
    for (let index = 0; index < count; index += 1) {
      const from = Math.floor(offset + index * ratio);
      const to = Math.max(from + 1, Math.floor(offset + (index + 1) * ratio));
      let sum = 0;
      for (let position = from; position < to; position += 1) {
        sum += input[position] ?? 0;
      }
      output[index] = sum / (to - from);
    }
    const consumed = offset + count * ratio;
    const kept = Math.floor(consumed);
    carry = input.slice(kept);
    offset = consumed - kept;
    return output;
  };
}
