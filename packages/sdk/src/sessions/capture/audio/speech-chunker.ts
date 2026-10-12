export const SPEECH_SAMPLE_RATE = 16_000;

const SAMPLES_PER_MS = SPEECH_SAMPLE_RATE / 1000;
const WINDOW_MS = 30;
const WINDOW_SAMPLES = WINDOW_MS * SAMPLES_PER_MS;
const PRE_ROLL_WINDOWS = 300 / WINDOW_MS;
const POST_ROLL_WINDOWS = 300 / WINDOW_MS;
const END_SILENCE_MS = 800;
const MIN_CHUNK_MS_BEFORE_SILENCE_END = 1500;
const MIN_SPEECH_MS = 400;
const MIN_SPEECH_LEVEL = 0.015;
const SPEECH_OVER_NOISE_RATIO = 3;
const INITIAL_NOISE_FLOOR = 0.005;
const NOISE_ADAPTATION_IN_SILENCE = 0.05;
const NOISE_ADAPTATION_IN_SPEECH = 0.0002;
const METER_GAIN = 5;

export interface SpeechChunk {
  endMs: number;
  samples: Float32Array;
  startMs: number;
}

export interface SpeechChunker {
  flush: () => void;
  push: (samples: Float32Array) => void;
}

interface OpenChunk {
  lastSpeechWindow: number;
  silentWindows: number;
  speechWindows: number;
  startSample: number;
  windows: Float32Array[];
}

function rootMeanSquare(samples: Float32Array): number {
  let sum = 0;
  for (const sample of samples) {
    sum += sample * sample;
  }
  return samples.length === 0 ? 0 : Math.sqrt(sum / samples.length);
}

export function meterLevel(samples: Float32Array): number {
  return Math.min(1, rootMeanSquare(samples) * METER_GAIN);
}

function concatenate(windows: Float32Array[]): Float32Array {
  const joined = new Float32Array(
    windows.reduce((total, window) => total + window.length, 0)
  );
  let offset = 0;
  for (const window of windows) {
    joined.set(window, offset);
    offset += window.length;
  }
  return joined;
}

function createNoiseGate() {
  let noiseFloor = INITIAL_NOISE_FLOOR;
  return (level: number): boolean => {
    const isSpeech =
      level >= Math.max(MIN_SPEECH_LEVEL, noiseFloor * SPEECH_OVER_NOISE_RATIO);
    const adaptation = isSpeech
      ? NOISE_ADAPTATION_IN_SPEECH
      : NOISE_ADAPTATION_IN_SILENCE;
    noiseFloor =
      level < noiseFloor
        ? level
        : noiseFloor + (level - noiseFloor) * adaptation;
    return isSpeech;
  };
}

interface SpeechChunkerOptions {
  maxSegmentMs: number;
  onChunk: (chunk: SpeechChunk) => void;
  startMs: number;
}

class UtteranceChunker implements SpeechChunker {
  private chunk: OpenChunk | null = null;
  private consumedSamples = 0;
  private readonly isSpeech = createNoiseGate();
  private readonly maxWindows: number;
  private readonly options: SpeechChunkerOptions;
  private pending = new Float32Array(0);
  private preRoll: Float32Array[] = [];

  constructor(options: SpeechChunkerOptions) {
    this.options = options;
    this.maxWindows = Math.floor(options.maxSegmentMs / WINDOW_MS);
  }

  flush = (): void => {
    if (this.pending.length > 0) {
      this.processWindow(this.pending);
      this.pending = new Float32Array(0);
    }
    if (this.chunk) {
      this.emit(
        this.chunk,
        this.chunk.lastSpeechWindow + 1 + POST_ROLL_WINDOWS
      );
    }
  };

  push = (samples: Float32Array): void => {
    let buffer = concatenate([this.pending, samples]);
    while (buffer.length >= WINDOW_SAMPLES) {
      this.processWindow(buffer.slice(0, WINDOW_SAMPLES));
      buffer = buffer.subarray(WINDOW_SAMPLES);
    }
    this.pending = buffer.slice();
  };

  private emit(open: OpenChunk, keptWindows: number): void {
    this.chunk = null;
    this.preRoll = [];
    if (open.speechWindows * WINDOW_MS < MIN_SPEECH_MS) {
      return;
    }
    const samples = concatenate(open.windows.slice(0, keptWindows));
    const startMs =
      this.options.startMs + Math.round(open.startSample / SAMPLES_PER_MS);
    this.options.onChunk({
      endMs: startMs + Math.round(samples.length / SAMPLES_PER_MS),
      samples,
      startMs,
    });
  }

  private extend(open: OpenChunk, window: Float32Array, speech: boolean): void {
    open.windows.push(window);
    if (speech) {
      open.speechWindows += 1;
      open.silentWindows = 0;
      open.lastSpeechWindow = open.windows.length - 1;
      return;
    }
    open.silentWindows += 1;
    const ended =
      open.silentWindows * WINDOW_MS >= END_SILENCE_MS &&
      open.windows.length * WINDOW_MS >= MIN_CHUNK_MS_BEFORE_SILENCE_END;
    if (ended) {
      this.emit(open, open.lastSpeechWindow + 1 + POST_ROLL_WINDOWS);
    }
  }

  private open(window: Float32Array, windowStart: number): OpenChunk {
    const preRollSamples = this.preRoll.reduce(
      (total, part) => total + part.length,
      0
    );
    return {
      lastSpeechWindow: this.preRoll.length,
      silentWindows: 0,
      speechWindows: 1,
      startSample: windowStart - preRollSamples,
      windows: [...this.preRoll, window],
    };
  }

  private processWindow(window: Float32Array): void {
    const windowStart = this.consumedSamples;
    this.consumedSamples += window.length;
    const speech = this.isSpeech(rootMeanSquare(window));
    if (this.chunk) {
      this.extend(this.chunk, window, speech);
    } else if (speech) {
      this.chunk = this.open(window, windowStart);
    } else {
      this.preRoll = [...this.preRoll, window].slice(-PRE_ROLL_WINDOWS);
    }
    if (this.chunk && this.chunk.windows.length + 1 > this.maxWindows) {
      this.emit(this.chunk, this.chunk.windows.length);
    }
  }
}

// Input is 16 kHz mono; timestamps are on the session clock.
export function createSpeechChunker(
  options: SpeechChunkerOptions
): SpeechChunker {
  return new UtteranceChunker(options);
}
