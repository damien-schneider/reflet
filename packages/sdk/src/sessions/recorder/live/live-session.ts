import type { SpeechChunk } from "../../capture/audio/speech-chunker";
import { maxWavDurationMs } from "../../capture/audio/wav";
import { captureFrame, describeElementRef } from "../../capture/element-ref";
import {
  createEvidenceScheduler,
  type EvidenceRequest,
  type EvidenceScheduler,
} from "../../capture/page/evidence-scheduler";
import type { SessionClock } from "../../capture/session-clock";
import {
  SpeakerDetection,
  type SpeakerDetectionState,
} from "../../capture/speakers/speaker-detection";
import type { AccountSessions } from "../../local/local-sessions";
import type { OutboxPayload, StoredDraft } from "../../local/session-store";
import type {
  SessionEvent,
  SessionGapReason,
  SessionLimitKind,
  SessionLimits,
  SpeakerToken,
  SpeakerTurn,
} from "../../protocol";
import type { SurfaceCapture } from "../surface-capture";
import {
  type CollectionRun,
  startCollectionRun,
  type VoiceCapture,
} from "./collection-run";
import {
  createEventBatcher,
  type EventBatcher,
  eventBatchSize,
} from "./event-batcher";
import {
  evidencePayload,
  speakerPayloads,
  voicePayload,
} from "./session-payloads";
import { SessionQuota } from "./session-quota";

const TICK_MS = 1000;
const DRAFT_SAVE_INTERVAL_MS = 5000;
const SPEAKER_SETTLE_MS = 2500;

export interface LiveSessionHooks {
  onHidden: () => void;
  onLevel: (level: number) => void;
  onPageHide: () => void;
  onSpeakers: (state: Exclude<SpeakerDetectionState, "off">) => void;
  onStorageFailure: (error: unknown) => void;
  onTick: () => void;
  reachLimit: (limit: SessionLimitKind) => void;
}

export interface SpeakerDetectionSetup {
  labelCount: number;
  references: Record<string, string>;
  requestToken: () => Promise<SpeakerToken | null>;
}

export interface LiveSessionOptions {
  account: Pick<AccountSessions, "outbox" | "store">;
  capture: SurfaceCapture;
  clock: SessionClock;
  hooks: LiveSessionHooks;
  limits: SessionLimits;
  sessionKey: string;
  speakers: SpeakerDetectionSetup | null;
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
  private readonly speakers: SpeakerDetection | null;
  private speakersSettling: number | undefined;
  private stopListening: AbortController | null = null;
  private tick: number | undefined;

  constructor(options: LiveSessionOptions) {
    this.options = options;
    this.clock = options.clock;
    this.hooks = options.hooks;
    this.sessionKey = options.sessionKey;
    this.quota = new SessionQuota(options.limits);
    this.events = createEventBatcher({
      maxBatchEvents: eventBatchSize(options.limits),
      onBatch: this.sendBatch,
    });
    this.evidence = createEvidenceScheduler({
      atMs: options.clock.atMs,
      includeSource: options.capture.source,
      limits: options.limits,
      onEvidence: (captured) => this.persist(evidencePayload(captured)),
    });
    this.speakers = options.speakers && this.detectSpeakers(options.speakers);
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
    this.stopRun();
    const atMs = this.clock.atMs();
    await this.finishSpeakers();
    this.stop();
    const { outbox, store } = this.options.account;
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
    this.stopRun();
    if (reason === "interrupted") {
      this.persistTurns(this.speakers?.closeRun() ?? []);
    } else {
      this.finishSpeakers().catch(this.hooks.onStorageFailure);
    }
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
        includeSource: this.options.capture.source,
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
    const { capture, limits } = this.options;
    const hasVoiceRoom = this.hasVoiceRoom();
    if (!hasVoiceRoom) {
      voice.stop();
    }
    const startMs = this.clock.atMs();
    const speakers = hasVoiceRoom ? this.speakers : null;
    speakers?.startRun(startMs);
    this.run = startCollectionRun({
      atMs: this.clock.atMs,
      collectEvents: capture.page && !this.quota.stopped.has("events"),
      includeSource: capture.source,
      maxSegmentMs: Math.min(
        limits.maxSegmentMs,
        maxWavDurationMs(limits.maxSegmentBytes)
      ),
      onChunk: this.recordChunk,
      onEvent: (event) => {
        this.events.add(event);
        if (event.kind === "click") {
          this.evidence.clicked();
        }
      },
      onLevel: this.hooks.onLevel,
      onLongHover: (element) =>
        this.quota.stopped.has("evidence")
          ? null
          : this.evidence.hovered(element),
      onNavigate: (frame) => {
        this.events.add({ atMs: this.clock.atMs(), frame, kind: "navigation" });
        this.evidence.navigated();
      },
      onSamples: speakers?.pushSamples,
      startMs,
      voice: hasVoiceRoom ? voice : null,
      watchNavigation: capture.page,
    });
    this.listen();
    this.tick = window.setInterval(this.hooks.onTick, TICK_MS);
  }

  stop(): void {
    this.stopCollecting();
    this.events.stop();
  }

  stopCollecting(): void {
    this.stopRun();
    this.speakers?.closeRun();
  }

  stopKind(limit: SessionLimitKind): void {
    this.quota.stopped.add(limit);
    if (limit === "segments") {
      this.run?.stopVoice();
      this.finishSpeakers().catch(this.hooks.onStorageFailure);
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

  private detectSpeakers(setup: SpeakerDetectionSetup): SpeakerDetection {
    const { store } = this.options.account;
    return new SpeakerDetection({
      labelCount: setup.labelCount,
      onLabelCount: (speakerLabelCount) =>
        store
          .patchDraft(this.sessionKey, { speakerLabelCount })
          .catch(this.hooks.onStorageFailure),
      onReferences: (speakerReferences) =>
        store
          .patchDraft(this.sessionKey, { speakerReferences })
          .catch(this.hooks.onStorageFailure),
      onState: this.hooks.onSpeakers,
      references: setup.references,
      requestToken: setup.requestToken,
    });
  }

  private async finishSpeakers(): Promise<void> {
    const turns = (await this.speakers?.finishRun()) ?? [];
    for (const payload of speakerPayloads(turns)) {
      await this.options.account.outbox.enqueue(this.sessionKey, payload);
    }
  }

  private listen(): void {
    this.stopListening = new AbortController();
    const listen = { signal: this.stopListening.signal };
    if (this.options.capture.pauseWhenHidden) {
      const onVisibility = () => {
        if (document.visibilityState === "hidden") {
          this.hooks.onHidden();
        }
      };
      document.addEventListener("visibilitychange", onVisibility, listen);
    }
    window.addEventListener("pagehide", this.hooks.onPageHide, listen);
  }

  private readonly recordChunk = (chunk: SpeechChunk): void => {
    if (!this.quota.acceptSegment()) {
      return;
    }
    this.persistTurns(this.speakers?.drainTurns() ?? []);
    this.persist(voicePayload(chunk));
    this.speakers?.keepReferences(chunk);
    this.settleSpeakers();
    if (this.quota.segmentsFull()) {
      this.hooks.reachLimit("segments");
    }
  };

  private persistTurns(turns: SpeakerTurn[]): void {
    for (const payload of speakerPayloads(turns)) {
      this.persist(payload);
    }
  }

  private settleSpeakers(): void {
    if (!this.speakers) {
      return;
    }
    window.clearTimeout(this.speakersSettling);
    this.speakersSettling = window.setTimeout(() => {
      this.persistTurns(this.speakers?.drainTurns() ?? []);
      this.speakers?.settleReferences();
    }, SPEAKER_SETTLE_MS);
  }

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

  private stopRun(): void {
    this.run?.stop();
    this.run = null;
    this.stopListening?.abort();
    this.stopListening = null;
    this.evidence.cancelPending();
    window.clearInterval(this.tick);
    window.clearTimeout(this.speakersSettling);
    this.events.flushAll();
  }
}
