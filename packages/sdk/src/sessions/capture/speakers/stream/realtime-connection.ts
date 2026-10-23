import { z } from "zod";
import type { SpeakerToken } from "../../../protocol";
import { SPEECH_SAMPLE_RATE } from "../../audio/speech-chunker";
import { encodePcm16 } from "../../audio/wav";
import { STREAMING_DELAY_MS } from "../speaker-turns";
import { bytesToBase64 } from "./base64";

const serverMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("session.created") }),
  z.object({ type: z.literal("session.updated") }),
  z.object({
    speaker_id: z.string().nullish(),
    type: z.literal("transcription.segment"),
  }),
  z.object({ type: z.literal("transcription.done") }),
  z.object({
    error: z.object({ message: z.unknown() }),
    type: z.literal("error"),
  }),
]);
type ServerMessage = z.infer<typeof serverMessageSchema>;

const HANDLED_MESSAGE_TYPES = new Set<string>(
  serverMessageSchema.options.map((option) => option.shape.type.value)
);
const envelopeSchema = z.object({ type: z.string() });

export interface RealtimeFailure {
  kind: "closed" | "error";
  message: string;
}

export interface RealtimeConnection {
  close: () => void;
  end: () => Promise<void>;
  sendAudio: (samples: Float32Array) => void;
}

export interface RealtimeConnectionOptions {
  onFailure: (failure: RealtimeFailure) => void;
  onReady: () => void;
  onSpeaker: (speakerId: string) => void;
  references: Record<string, string>;
  token: SpeakerToken;
}

type ConnectionPhase =
  | "connecting"
  | "configuring"
  | "streaming"
  | "ending"
  | "closed";

function readServerMessage(data: unknown): ServerMessage | null {
  if (typeof data !== "string") {
    throw new Error("Mistral sent a binary message.");
  }
  const message: unknown = JSON.parse(data);
  const { type } = envelopeSchema.parse(message);
  return HANDLED_MESSAGE_TYPES.has(type)
    ? serverMessageSchema.parse(message)
    : null;
}

function sessionUpdate(references: Record<string, string>) {
  const hasReferences = Object.keys(references).length > 0;
  return {
    session: {
      audio_format: { encoding: "pcm_s16le", sample_rate: SPEECH_SAMPLE_RATE },
      diarize: true,
      ...(hasReferences ? { speaker_references: references } : {}),
      target_streaming_delay_ms: STREAMING_DELAY_MS,
    },
    type: "session.update",
  };
}

export function openRealtimeConnection(
  options: RealtimeConnectionOptions
): RealtimeConnection {
  const socket = new WebSocket(options.token.url, [
    "realtime",
    options.token.token,
  ]);
  let phase: ConnectionPhase = "connecting";
  let markClosed: () => void = () => undefined;
  const closed = new Promise<void>((resolve) => {
    markClosed = resolve;
  });

  const shutDown = () => {
    phase = "closed";
    socket.close();
    markClosed();
  };
  const fail = (failure: RealtimeFailure) => {
    if (phase !== "closed") {
      shutDown();
      options.onFailure(failure);
    }
  };
  const send = (message: object) => socket.send(JSON.stringify(message));

  const handle = (message: ServerMessage) => {
    switch (message.type) {
      case "session.created":
        phase = "configuring";
        send(sessionUpdate(options.references));
        return;
      case "session.updated":
        phase = "streaming";
        options.onReady();
        return;
      case "transcription.segment":
        if (message.speaker_id) {
          options.onSpeaker(message.speaker_id);
        }
        return;
      case "transcription.done":
        if (phase === "ending") {
          shutDown();
          return;
        }
        fail({ kind: "closed", message: "Mistral ended the speaker stream." });
        return;
      default: {
        const reason = message.error.message;
        fail({
          kind: "error",
          message: typeof reason === "string" ? reason : JSON.stringify(reason),
        });
      }
    }
  };

  socket.addEventListener("message", (event) => {
    let message: ServerMessage | null;
    try {
      message = readServerMessage(event.data);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      fail({ kind: "error", message: `Unreadable speaker event: ${reason}` });
      return;
    }
    if (message && phase !== "closed") {
      handle(message);
    }
  });
  const lose = (message: string) => {
    if (phase === "ending") {
      shutDown();
      return;
    }
    fail({ kind: "closed", message });
  };
  socket.addEventListener("error", () =>
    lose("The speaker stream failed, or the page's security policy blocked it.")
  );
  socket.addEventListener("close", (event) =>
    lose(`The speaker stream closed (${event.code}).`)
  );

  return {
    close: shutDown,
    end: () => {
      if (phase === "streaming") {
        phase = "ending";
        send({ type: "input_audio.end" });
      } else if (phase !== "ending") {
        shutDown();
      }
      return closed;
    },
    sendAudio: (samples) => {
      if (phase !== "streaming") {
        throw new Error("The speaker stream is not ready for audio.");
      }
      send({
        audio: bytesToBase64(encodePcm16(samples)),
        type: "input_audio.append",
      });
    },
  };
}
