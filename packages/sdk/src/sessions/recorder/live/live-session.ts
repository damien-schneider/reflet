import type { SpeechChunk } from "../../capture/audio/speech-chunker";
import { maxWavDurationMs } from "../../capture/audio/wav";
import { captureFrame, describeElementRef } from "../../capture/element-ref";
import {
  createEvidenceScheduler,
  type EvidenceRequest,
  type EvidenceScheduler,
} from "../../capture/page/evidence-scheduler";
import type { SessionClock } from "../../capture/session-clock";
import type { AccountSessions } from "../../local/local-sessions";
import type { OutboxPayload, StoredDraft } from "../../local/session-store";
import type {
  SessionEvent,
  SessionGapReason,
  SessionLimitKind,
  SessionLimits,
} from "../../protocol";
import {
  type CollectionRun,
  startCollectionRun,
  type VoiceCapture,
} from "./collection-run";
import { createEventBatcher, type EventBatcher } from "./event-batcher";
import { evidencePayload, voicePayload } from "./session-payloads";
import { SessionQuota } from "./session-quota";

const LARGEST_EVENT_BATCH = 100;
const TICK_MS = 1000;
const DRAFT_SAVE_INTERVAL_MS = 5000;

export interface LiveSessionHooks {
  onHidden: () => void;
  onLevel: (level: number) => void;
  onPageHide: () => void;
  onStorageFailure: (error: unknown) => void;
  onTick: () => void;
  reachLimit: (limit: SessionLimitKind) => void;
}

export interface LiveSessionOptions {
  account: Pick<AccountSessions, "outbox" | "store">;
  clock: SessionClock;
  hooks: LiveSessionHooks;
  includeSource: boolean;
  limits: SessionLimits;
  sessionKey: string;
}

export class LiveSession {
  readonly clock: SessionClock;
  readonly sessionKey: string;
  private readonly events: EventBatcher;
  private readonly evidence: EvidenceScheduler;
  private readonly hooks: LiveSessionHooks;
  private lastSavedAt = Date.now();
  private readonly options: LiveSessionOptions;
  private readonly quota: SessionQuota;
  private run: CollectionRun | null = null;
  private stopListening: AbortController | null = null;
  private tick: number | undefined;

  constructor(options: LiveSessionOptions) {
    this.options = options;
    this.clock = options.clock;
    this.hooks = options.hooks;
    this.sessionKey = options.sessionKey;
    this.quota = new SessionQuota(options.limits);
    this.events = createEventBatcher({
      maxBatchEvents: Math.min(
        LARGEST_EVENT_BATCH,
        options.limits.maxEventsPerBatch
      ),
      onBatch: this.sendBatch,
    });
    this.evidence = createEvidenceScheduler({
      atMs: options.clock.atMs,
      includeSource: options.includeSource,
      limits: options.limits,
      onEvidence: (captured) => this.persist(evidencePayload(captured)),
    });
  }

  annotate(key: string, note: string | null): void {
    this.events.annotate(key, note);
  }

  captureEvidence(request: EvidenceRequest): string | null {
    const clientKey = this.quota.stopped.has("evidence")
      ? null
      : this.evidence.capture(request);
    if (clientKey === null) {
      this.hooks.reachLimit("evidence");
    }
    return clientKey;
  }

  checkpoint(): void {
    if (Date.now() - this.lastSavedAt >= DRAFT_SAVE_INTERVAL_MS) {
      this.saveDraft();
    }
  }

  async end(): Promise<void> {
    this.stop();
    const { outbox, store } = this.options.account;
    const atMs = this.clock.atMs();
    await outbox.enqueue(this.sessionKey, {
      action: "end",
      atMs,
      kind: "collection",
    });
    await outbox.enqueue(this.sessionKey, { kind: "analyze" });
    await store.patchDraft(this.sessionKey, this.draftPatch("ended"));
  }

  hasVoiceRoom(): boolean {
    return !this.quota.stopped.has("segments");
  }

  mark(): { atMs: number; key: string } {
    const key = crypto.randomUUID();
    const atMs = this.clock.atMs();
    this.events.hold(key, {
      atMs,
      element: null,
      evidenceClientKey: this.captureEvidence({ trigger: "mark" }),
      frame: captureFrame(),
      kind: "mark",
      note: null,
    });
    return { atMs, key };
  }

  pause(reason: SessionGapReason): void {
    this.stopCollecting();
    if (!this.clock.isPaused()) {
      const atMs = this.clock.pause(reason);
      this.persist({ action: "pause", atMs, kind: "collection", reason });
    }
    this.saveDraft(reason === "interrupted" ? "interrupted" : "paused");
  }

  persist(payload: OutboxPayload): void {
    this.options.account.outbox
      .enqueue(this.sessionKey, payload)
      .catch(this.hooks.onStorageFailure);
  }

  resume(voice: VoiceCapture): void {
    const atMs = this.clock.resume();
    this.persist({ action: "resume", atMs, kind: "collection" });
    this.saveDraft("recording");
    this.startCollecting(voice);
  }

  select(element: Element, note: string | null): void {
    this.events.add({
      atMs: this.clock.atMs(),
      element: describeElementRef(element, {
        includeSource: this.options.includeSource,
      }),
      evidenceClientKey: this.captureEvidence({
        element,
        note,
        trigger: "select",
      }),
      frame: captureFrame(),
      kind: "select",
      note,
    });
  }

  startCollecting(voice: VoiceCapture): void {
    const { limits } = this.options;
    const hasVoiceRoom = this.hasVoiceRoom();
    if (!hasVoiceRoom) {
      voice.stop();
    }
    this.run = startCollectionRun({
      atMs: this.clock.atMs,
      collectEvents: !this.quota.stopped.has("events"),
      includeSource: this.options.includeSource,
      maxSegmentMs: Math.min(
        limits.maxSegmentMs,
        maxWavDurationMs(limits.maxSegmentBytes)
      ),
      onChunk: this.recordChunk,
      onEvent: (event) => this.events.add(event),
      onLevel: this.hooks.onLevel,
      onNavigate: (frame) => {
        this.events.add({ atMs: this.clock.atMs(), frame, kind: "navigation" });
        this.evidence.navigated();
      },
      voice: hasVoiceRoom ? voice : null,
    });
    this.listen();
    this.tick = window.setInterval(this.hooks.onTick, TICK_MS);
  }

  stop(): void {
    this.stopCollecting();
    this.events.stop();
  }

  stopCollecting(): void {
    this.run?.stop();
    this.run = null;
    this.stopListening?.abort();
    this.stopListening = null;
    this.evidence.cancelPending();
    window.clearInterval(this.tick);
    this.events.flushAll();
  }

  stopKind(limit: SessionLimitKind): void {
    this.quota.stopped.add(limit);
    if (limit === "segments") {
      this.run?.stopVoice();
    }
    if (limit === "events") {
      this.run?.stopEvents();
    }
  }

  private draftPatch(state?: StoredDraft["state"]) {
    this.lastSavedAt = Date.now();
    return {
      ...(state ? { state } : {}),
      gaps: this.clock.gaps(),
      lastActiveAt: this.lastSavedAt,
    };
  }

  private listen(): void {
    this.stopListening = new AbortController();
    const listen = { signal: this.stopListening.signal };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        this.hooks.onHidden();
      }
    };
    document.addEventListener("visibilitychange", onVisibility, listen);
    window.addEventListener("pagehide", this.hooks.onPageHide, listen);
  }

  private readonly recordChunk = (chunk: SpeechChunk): void => {
    if (!this.quota.acceptSegment()) {
      return;
    }
    this.persist(voicePayload(chunk));
    if (this.quota.segmentsFull()) {
      this.hooks.reachLimit("segments");
    }
  };

  private saveDraft(state?: StoredDraft["state"]): void {
    this.options.account.store
      .patchDraft(this.sessionKey, this.draftPatch(state))
      .catch(this.hooks.onStorageFailure);
  }

  private readonly sendBatch = (batch: SessionEvent[]): void => {
    const accepted = this.quota.acceptEvents(batch);
    if (accepted.length > 0) {
      const clientKey = crypto.randomUUID();
      this.persist({ clientKey, events: accepted, kind: "events" });
    }
    if (this.quota.eventsFull()) {
      this.hooks.reachLimit("events");
    }
  };
}
