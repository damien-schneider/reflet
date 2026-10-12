export type MicrophoneFailureKind =
  | "insecure_context"
  | "mic_blocked_by_site"
  | "mic_denied"
  | "mic_unavailable";

const FAILURE_MESSAGES: Record<MicrophoneFailureKind, string> = {
  insecure_context:
    "The microphone only works on a secure page (https or localhost).",
  mic_blocked_by_site:
    "This site's Permissions-Policy header turns the microphone off. Allow microphone=(self) in it to record sessions here.",
  mic_denied:
    "The microphone is blocked for this site. Allow it from the address bar, then try again.",
  mic_unavailable:
    "No microphone is available. Plug one in or close the app using it, then try again.",
};

const PROCESSOR_NAME = "reflet-session-capture";
const FALLBACK_FRAME_SIZE = 4096;
const WORKLET_SOURCE = `
const FRAME_SIZE = 2048;
class RefletSessionCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frame = new Float32Array(FRAME_SIZE);
    this.filled = 0;
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;
    for (let index = 0; index < channel.length; index += 1) {
      this.frame[this.filled] = channel[index];
      this.filled += 1;
      if (this.filled === FRAME_SIZE) {
        this.port.postMessage(this.frame, [this.frame.buffer]);
        this.frame = new Float32Array(FRAME_SIZE);
        this.filled = 0;
      }
    }
    return true;
  }
}
registerProcessor("${PROCESSOR_NAME}", RefletSessionCapture);
`;

export class MicrophoneError extends Error {
  readonly kind: MicrophoneFailureKind;

  constructor(kind: MicrophoneFailureKind) {
    super(FAILURE_MESSAGES[kind]);
    this.name = "MicrophoneError";
    this.kind = kind;
  }
}

export interface Microphone {
  readonly sampleRate: number;
  stop: () => void;
}

function isMicrophoneDisallowedBySite(): boolean {
  const policy =
    Reflect.get(document, "permissionsPolicy") ??
    Reflect.get(document, "featurePolicy");
  if (typeof policy !== "object" || policy === null) {
    return false;
  }
  const allowsFeature: unknown = Reflect.get(policy, "allowsFeature");
  return (
    typeof allowsFeature === "function" &&
    allowsFeature.call(policy, "microphone") === false
  );
}

function failureKind(error: unknown): MicrophoneFailureKind {
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? error.name
      : null;
  if (name !== "NotAllowedError" && name !== "SecurityError") {
    return "mic_unavailable";
  }
  return isMicrophoneDisallowedBySite() ? "mic_blocked_by_site" : "mic_denied";
}

async function requestVoiceStream(): Promise<MediaStream> {
  if (!(globalThis.isSecureContext && navigator.mediaDevices?.getUserMedia)) {
    throw new MicrophoneError("insecure_context");
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        autoGainControl: true,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
  } catch (error) {
    throw new MicrophoneError(failureKind(error));
  }
}

async function connectWorklet(options: {
  context: AudioContext;
  moduleUrl: string;
  onFrame: (frame: Float32Array) => void;
}): Promise<AudioNode> {
  await options.context.audioWorklet.addModule(options.moduleUrl);
  const node = new AudioWorkletNode(options.context, PROCESSOR_NAME);
  node.port.onmessage = (event: MessageEvent<unknown>) => {
    if (event.data instanceof Float32Array) {
      options.onFrame(event.data);
    }
  };
  return node;
}

function connectScriptProcessor(
  context: AudioContext,
  onFrame: (frame: Float32Array) => void
): AudioNode {
  const processor = context.createScriptProcessor(FALLBACK_FRAME_SIZE, 1, 1);
  processor.onaudioprocess = (event) => {
    onFrame(event.inputBuffer.getChannelData(0).slice());
  };
  return processor;
}

export async function openMicrophone(options: {
  onFrame: (frame: Float32Array) => void;
}): Promise<Microphone> {
  const stream = await requestVoiceStream();
  let active = true;
  const onFrame = (frame: Float32Array) => {
    if (active) {
      options.onFrame(frame);
    }
  };
  const moduleUrl = URL.createObjectURL(
    new Blob([WORKLET_SOURCE], { type: "text/javascript" })
  );
  const stopTracks = () => {
    for (const track of stream.getTracks()) {
      track.stop();
    }
  };
  try {
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const silentSink = context.createGain();
    silentSink.gain.value = 0;
    silentSink.connect(context.destination);
    const capture = await connectWorklet({ context, moduleUrl, onFrame }).catch(
      () => connectScriptProcessor(context, onFrame)
    );
    source.connect(capture);
    capture.connect(silentSink);
    await context.resume();
    return {
      sampleRate: context.sampleRate,
      stop: () => {
        active = false;
        stopTracks();
        source.disconnect();
        capture.disconnect();
        silentSink.disconnect();
        context.close().catch(() => undefined);
        URL.revokeObjectURL(moduleUrl);
      },
    };
  } catch {
    stopTracks();
    URL.revokeObjectURL(moduleUrl);
    throw new MicrophoneError("mic_unavailable");
  }
}
