import type { SessionApi } from "../api/session-api";
import type { MicrophoneFailureKind } from "../capture/audio/microphone";
import type { SessionAccount } from "../local/session-store";
import type {
  SessionLimitKind,
  SessionLimits,
  SessionSurface,
} from "../protocol";
import { RecordingController } from "./recording-controller";

export type RecorderPhase =
  | "idle"
  | "requesting"
  | "recording"
  | "paused"
  | "finishing"
  | "failed";

export interface RecorderFailure {
  kind: MicrophoneFailureKind | "storage" | "limit" | "auth" | "network";
  message: string;
}

export interface RecorderSnapshot {
  activeMs: number;
  failure: RecorderFailure | null;
  lastMark: { atMs: number; key: string } | null;
  limitsReached: SessionLimitKind[];
  markCount: number;
  nearLimit: boolean;
  pauseReason: "paused" | "hidden" | "limit" | null;
  phase: RecorderPhase;
  sessionId: string | null;
  sessionKey: string | null;
  /** Epoch ms the session clock counts from. */
  startedAt: number | null;
}

export interface SessionRecorder {
  annotateMark: (key: string, note: string) => void;
  /** Stops collecting without ending the server session; the draft shows as interrupted. */
  dispose: () => void;
  finish: () => Promise<{ sessionKey: string }>;
  getSnapshot: () => RecorderSnapshot;
  mark: () => string;
  pause: (reason?: "paused" | "hidden") => void;
  resume: () => Promise<void>;
  resumeDraft: (sessionKey: string) => Promise<void>;
  select: (element: Element, note?: string) => void;
  /** Asks for the microphone before anything is stored, sent or shown as recording. */
  start: (options: { title?: string }) => Promise<void>;
  subscribe: (listener: () => void) => () => void;
  subscribeLevel: (listener: (level: number) => void) => () => void;
}

export interface SessionRecorderOptions {
  account: SessionAccount;
  api: SessionApi;
  limits: SessionLimits;
  surface: SessionSurface;
}

export function createSessionRecorder(
  options: SessionRecorderOptions
): SessionRecorder {
  return new RecordingController(options);
}
