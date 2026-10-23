import {
  MicrophoneError,
  type MicrophoneFailureKind,
  openMicrophone,
} from "../../capture/audio/microphone";
import {
  createSpeechChunker,
  meterLevel,
  type SpeechChunk,
  type SpeechChunker,
} from "../../capture/audio/speech-chunker";
import { createDownsampler } from "../../capture/audio/wav";
import {
  type InteractionRecorder,
  startInteractionRecorder,
} from "../../capture/page/interaction-recorder";
import {
  type NavigationWatch,
  startNavigationWatch,
} from "../../capture/page/navigation-watch";
import type { Frame, SessionEvent } from "../../protocol";

export interface VoiceCapture {
  attach: (options: {
    maxSegmentMs: number;
    onChunk: (chunk: SpeechChunk) => void;
    onLevel: (level: number) => void;
    onSamples?: (samples: Float32Array) => void;
    startMs: number;
  }) => void;
  stop: () => void;
}

async function openVoiceCapture(): Promise<VoiceCapture> {
  let receive: ((frame: Float32Array) => void) | null = null;
  let chunker: SpeechChunker | null = null;
  const microphone = await openMicrophone({
    onFrame: (frame) => receive?.(frame),
  });
  let downsample: (frame: Float32Array) => Float32Array;
  try {
    downsample = createDownsampler(microphone.sampleRate);
  } catch {
    microphone.stop();
    throw new MicrophoneError("mic_unavailable");
  }
  return {
    attach: (options) => {
      const speech = createSpeechChunker(options);
      chunker = speech;
      receive = (frame) => {
        const samples = downsample(frame);
        options.onLevel(meterLevel(samples));
        speech.push(samples);
        options.onSamples?.(samples);
      };
    },
    stop: () => {
      receive = null;
      microphone.stop();
      chunker?.flush();
      chunker = null;
    },
  };
}

export type VoiceOpening =
  | { failure: { kind: MicrophoneFailureKind; message: string }; voice: null }
  | { failure: null; voice: VoiceCapture };

export async function openVoice(): Promise<VoiceOpening> {
  try {
    return { failure: null, voice: await openVoiceCapture() };
  } catch (error) {
    const refusal =
      error instanceof MicrophoneError
        ? error
        : new MicrophoneError("mic_unavailable");
    return {
      failure: { kind: refusal.kind, message: refusal.message },
      voice: null,
    };
  }
}

export interface CollectionRun {
  stop: () => void;
  stopEvents: () => void;
  stopVoice: () => void;
}

export interface CollectionRunOptions {
  atMs: () => number;
  collectEvents: boolean;
  includeSource: boolean;
  maxSegmentMs: number;
  onChunk: (chunk: SpeechChunk) => void;
  onEvent: (event: SessionEvent) => void;
  onLevel: (level: number) => void;
  onLongHover: (element: Element) => string | null;
  onNavigate: (frame: Frame) => void;
  onSamples?: (samples: Float32Array) => void;
  startMs: number;
  voice: VoiceCapture | null;
}

export function startCollectionRun(
  options: CollectionRunOptions
): CollectionRun {
  let { voice } = options;
  voice?.attach({
    maxSegmentMs: options.maxSegmentMs,
    onChunk: options.onChunk,
    onLevel: options.onLevel,
    onSamples: options.onSamples,
    startMs: options.startMs,
  });
  let interactions: InteractionRecorder | null = options.collectEvents
    ? startInteractionRecorder(options)
    : null;
  const navigation: NavigationWatch = startNavigationWatch(options);
  const stopVoice = () => {
    const stopping = voice;
    voice = null;
    stopping?.stop();
    options.onLevel(0);
  };
  const stopEvents = () => {
    interactions?.stop();
    interactions = null;
  };
  return {
    stop: () => {
      stopVoice();
      stopEvents();
      navigation.stop();
    },
    stopEvents,
    stopVoice,
  };
}
