import type { LiveStatus } from "../../../live/protocol";
import {
  createSessionApi,
  SessionApiError,
} from "../../../sessions/api/session-api";
import {
  transportOver,
  uploadSessionBlob,
} from "../../../sessions/api/session-transports";
import {
  captureFrame,
  describeElementRef,
} from "../../../sessions/capture/element-ref";
import {
  type CapturedEvidence,
  createEvidenceScheduler,
} from "../../../sessions/capture/page/evidence-scheduler";
import {
  type InteractionRecorder,
  startInteractionRecorder,
} from "../../../sessions/capture/page/interaction-recorder";
import { evidenceBody } from "../../../sessions/local/outbox-operations";
import type { SessionEvent } from "../../../sessions/protocol";
import {
  createEventBatcher,
  eventBatchSize,
} from "../../../sessions/recorder/live/event-batcher";
import { evidencePayload } from "../../../sessions/recorder/live/session-payloads";
import { locateElementSource } from "../element-source";
import { newLocalId } from "../local-id";
import { describeSource } from "../source-location";
import { liveTransport } from "./live-route";

export type LiveCaptureKind = "events" | "evidence";
export type LiveLinkSession = NonNullable<LiveStatus["session"]>;

export interface LiveLink {
  select: (element: Element, note: string | null) => Promise<void>;
  stop: () => void;
}

export function startLiveLink(
  session: LiveLinkSession,
  stopped: Set<LiveCaptureKind>
): LiveLink {
  const api = createSessionApi(transportOver(liveTransport));
  const sessionId = session.id;
  const atMs = () => Date.now() - session.startedAt;
  const listening = new AbortController();
  let interactions: InteractionRecorder | null = null;
  let isRunning = true;

  const stopCapture = (kind: LiveCaptureKind) => {
    stopped.add(kind);
    if (kind === "events") {
      interactions?.stop();
      interactions = null;
    }
  };
  const dropFailure = (kind: LiveCaptureKind) => (error: unknown) => {
    const isLimit =
      error instanceof SessionApiError &&
      (error.status === 413 || error.limit !== null);
    if (isLimit) {
      stopCapture(kind);
    }
  };

  const sendEvents = (events: SessionEvent[]) =>
    api.events({ clientKey: newLocalId(), events, sessionId });

  const sendEvidence = async (captured: CapturedEvidence) => {
    const payload = evidencePayload(captured);
    const blob = payload.image?.blob ?? null;
    const storageId = blob
      ? await uploadSessionBlob(
          await api.uploadUrl({ kind: "image", sessionId }),
          blob
        )
      : null;
    await api.addEvidence(evidenceBody(payload, sessionId, storageId));
  };

  const batcher = createEventBatcher({
    maxBatchEvents: eventBatchSize(session.limits),
    onBatch: (events) => {
      sendEvents(events)
        .then((result) => {
          if (result.limitReached) {
            stopCapture("events");
          }
        })
        .catch(dropFailure("events"));
    },
  });
  const scheduler = createEvidenceScheduler({
    atMs,
    includeSource: true,
    limits: session.limits,
    onEvidence: (captured) => {
      sendEvidence(captured).catch(dropFailure("evidence"));
    },
  });

  if (!stopped.has("events")) {
    interactions = startInteractionRecorder({
      atMs,
      includeSource: true,
      onEvent: (event) => {
        batcher.add(event);
        if (event.kind === "click") {
          scheduler.clicked();
        }
      },
      onLongHover: (element) =>
        stopped.has("evidence") ? null : scheduler.hovered(element),
    });
  }

  window.addEventListener(
    "focus",
    () => {
      if (!stopped.has("events")) {
        batcher.add({
          atMs: atMs(),
          frame: captureFrame(),
          kind: "navigation",
        });
      }
      if (!stopped.has("evidence")) {
        scheduler.navigated();
      }
    },
    { signal: listening.signal }
  );

  return {
    select: async (element, note) => {
      if (!isRunning) {
        throw new Error("Reflet Live is not recording.");
      }
      const pickedAtMs = atMs();
      const frame = captureFrame();
      const evidenceClientKey = stopped.has("evidence")
        ? null
        : scheduler.capture({ element, note, trigger: "select" });
      const ref = describeElementRef(element, { includeSource: true });
      const located = await locateElementSource(element).catch(() => null);
      const source = located ? await describeSource(located, true) : ref.source;
      await sendEvents([
        {
          atMs: pickedAtMs,
          element: { ...ref, source },
          evidenceClientKey,
          frame,
          kind: "select",
          note,
        },
      ]);
    },
    stop: () => {
      isRunning = false;
      listening.abort();
      interactions?.stop();
      interactions = null;
      scheduler.cancelPending();
      batcher.flushAll();
      batcher.stop();
    },
  };
}
