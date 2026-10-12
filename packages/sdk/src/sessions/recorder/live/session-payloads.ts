import {
  SPEECH_SAMPLE_RATE,
  type SpeechChunk,
} from "../../capture/audio/speech-chunker";
import { encodeWav } from "../../capture/audio/wav";
import { captureFrame } from "../../capture/element-ref";
import type { CapturedEvidence } from "../../capture/page/evidence-scheduler";
import type { OutboxPayload, StoredDraft } from "../../local/session-store";
import type { SessionGap, SessionSurface } from "../../protocol";

export function newSessionDraft(options: {
  accountKey: string;
  surface: SessionSurface;
  title: string;
}): StoredDraft {
  const startedAt = Date.now();
  return {
    ...options,
    gaps: [],
    lastActiveAt: startedAt,
    sessionId: null,
    sessionKey: crypto.randomUUID(),
    startedAt,
    state: "recording",
  };
}

/** A draft left open by a reload stopped at its last save, not when it is resumed. */
export function interruptedGap(draft: StoredDraft): SessionGap | null {
  if (draft.gaps.some((gap) => gap.endMs === null)) {
    return null;
  }
  const startMs = Math.max(0, draft.lastActiveAt - draft.startedAt);
  return { endMs: null, reason: "interrupted", startMs };
}

export function startPayload(draft: StoredDraft): OutboxPayload {
  const page = captureFrame();
  return {
    body: {
      clientKey: draft.sessionKey,
      page: { title: page.title ?? "", url: page.url },
      startedAt: draft.startedAt,
      surface: draft.surface,
      ...(draft.title ? { title: draft.title } : {}),
    },
    kind: "start",
  };
}

export function evidencePayload(captured: CapturedEvidence): OutboxPayload {
  const { element, image, missingReason, note } = captured;
  return {
    evidence: {
      atMs: captured.atMs,
      clientKey: captured.clientKey,
      element: element ?? undefined,
      frame: captured.frame,
      missingReason: missingReason ?? undefined,
      note: note ?? undefined,
      trigger: captured.trigger,
    },
    image: image ? { ...image, storageId: null } : null,
    kind: "evidence",
  };
}

export function voicePayload(chunk: SpeechChunk): OutboxPayload {
  return {
    audio: new Blob([encodeWav(chunk.samples, SPEECH_SAMPLE_RATE)], {
      type: "audio/wav",
    }),
    clientKey: crypto.randomUUID(),
    endMs: chunk.endMs,
    kind: "voice",
    startMs: chunk.startMs,
    storageId: null,
  };
}
