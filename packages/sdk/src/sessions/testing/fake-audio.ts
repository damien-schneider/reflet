import { type Mock, vi } from "vitest";

interface FakeNode {
  connect: Mock;
  disconnect: Mock;
}

interface FakeProcessor extends FakeNode {
  onaudioprocess:
    | ((event: { inputBuffer: { getChannelData: () => Float32Array } }) => void)
    | null;
}

interface FakeWorkletPort {
  onmessage: ((event: { data: unknown }) => void) | null;
}

export interface FakeAudio {
  contexts: { close: Mock }[];
  emitFrame: (frame: Float32Array) => void;
  getUserMedia: Mock;
  processors: FakeProcessor[];
  revokeObjectURL: Mock;
  tracks: { stop: Mock }[];
  workletNodes: { port: FakeWorkletPort }[];
}

interface FakeAudioOptions {
  denyWith?: string;
  workletFails?: boolean;
}

function fakeNode(): FakeNode {
  return { connect: vi.fn(), disconnect: vi.fn() };
}

function fakeAudioContextClass(audio: FakeAudio, options: FakeAudioOptions) {
  return class FakeAudioContext {
    readonly audioWorklet = {
      addModule: vi.fn(() =>
        options.workletFails
          ? Promise.reject(new Error("Blocked by CSP"))
          : Promise.resolve()
      ),
    };
    readonly close = vi.fn(() => Promise.resolve());
    readonly destination = fakeNode();
    readonly resume = vi.fn(() => Promise.resolve());
    readonly sampleRate = 48_000;
    readonly state = "running";

    constructor() {
      audio.contexts.push(this);
    }

    createGain() {
      return { ...fakeNode(), gain: { value: 1 } };
    }

    createMediaStreamSource() {
      return fakeNode();
    }

    createScriptProcessor() {
      const processor: FakeProcessor = { ...fakeNode(), onaudioprocess: null };
      audio.processors.push(processor);
      return processor;
    }
  };
}

function fakeWorkletNodeClass(audio: FakeAudio) {
  return class FakeWorkletNode {
    readonly connect = vi.fn();
    readonly disconnect = vi.fn();
    readonly port: FakeWorkletPort = { onmessage: null };

    constructor() {
      audio.workletNodes.push(this);
    }
  };
}

function emitTo(audio: FakeAudio, frame: Float32Array): void {
  for (const node of audio.workletNodes) {
    node.port.onmessage?.({ data: frame });
  }
  for (const processor of audio.processors) {
    processor.onaudioprocess?.({
      inputBuffer: { getChannelData: () => frame },
    });
  }
}

/** Stands in for getUserMedia + Web Audio, which jsdom does not implement. */
export function installFakeAudio(options: FakeAudioOptions = {}): FakeAudio {
  const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }];
  const revokeObjectURL = vi.fn();
  const audio: FakeAudio = {
    contexts: [],
    emitFrame: (frame) => emitTo(audio, frame),
    getUserMedia: vi.fn(() =>
      options.denyWith
        ? Promise.reject(new DOMException("Refused", options.denyWith))
        : Promise.resolve({ getTracks: () => tracks })
    ),
    processors: [],
    revokeObjectURL,
    tracks,
    workletNodes: [],
  };
  class FakeURL extends URL {
    static readonly createObjectURL = vi.fn(() => "blob:reflet-worklet");
    static readonly revokeObjectURL = revokeObjectURL;
  }
  vi.stubGlobal("AudioContext", fakeAudioContextClass(audio, options));
  vi.stubGlobal("AudioWorkletNode", fakeWorkletNodeClass(audio));
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("URL", FakeURL);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: audio.getUserMedia },
  });
  return audio;
}
