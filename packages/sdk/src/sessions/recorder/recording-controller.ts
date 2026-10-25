import { clip } from "../../feedback/core/page-context";
import { describeStorageFailure } from "../../storage/indexed-db";
import { createSessionClock } from "../capture/session-clock";
import { type AccountSessions, localSessions } from "../local/local-sessions";
import type { OutboxIssue } from "../local/outbox";
import type { StoredDraft } from "../local/session-store";
import type { SessionGap, SessionLimitKind } from "../protocol";
import { openVoice, type VoiceCapture } from "./live/collection-run";
import { LiveSession } from "./live/live-session";
import {
  interruptedGap,
  newSessionDraft,
  startPayload,
} from "./live/session-payloads";
import { requestSpeakerToken } from "./live/speaker-token";
import type {
  RecorderFailure,
  RecorderSnapshot,
  RecorderStartOptions,
  SessionRecorder,
  SessionRecorderOptions,
} from "./session-recorder";
import { SURFACE_CAPTURE } from "./surface-capture";

const MAX_NOTE_CHARS = 1000;
const MAX_TITLE_CHARS = 120;
const SESSION_GONE = "This session no longer exists on Reflet.";

const IDLE: RecorderSnapshot = {
  activeMs: 0,
  failure: null,
  lastMark: null,
  limitsReached: [],
  markCount: 0,
  nearLimit: false,
  pauseReason: null,
  phase: "idle",
  sessionId: null,
  sessionKey: null,
  speakers: "off",
  startedAt: null,
};

function cleanText(text: string | undefined, maxChars: number): string | null {
  const trimmed = text?.trim() ?? "";
  return trimmed ? clip(trimmed, maxChars) : null;
}

export class RecordingController implements SessionRecorder {
  private readonly account: AccountSessions;
  private readonly levelListeners = new Set<(level: number) => void>();
  private readonly listeners = new Set<() => void>();
  private live: LiveSession | null = null;
  private readonly options: SessionRecorderOptions;
  private releaseClaim: () => void = () => undefined;
  private snapshot: RecorderSnapshot = IDLE;
  private readonly stopIssues: () => void;
  private readonly stopSessionIds: () => void;

  constructor(options: SessionRecorderOptions) {
    this.options = options;
    this.account = localSessions.connect({
      accountKey: options.account.key,
      api: options.api,
      limits: options.limits,
    });
    this.stopIssues = this.account.outbox.subscribeIssues(this.handleIssue);
    this.stopSessionIds = localSessions.subscribe(this.syncSessionId);
  }

  annotateMark(key: string, note: string): void {
    this.live?.annotate(key, cleanText(note, MAX_NOTE_CHARS));
  }

  async cancel(): Promise<void> {
    const live = this.live;
    if (!live) {
      return;
    }
    const cancelling = this.account.outbox.cancelSession(live.sessionKey);
    this.close(live, IDLE);
    await cancelling;
  }

  dispose(): void {
    this.interrupt();
    this.stopIssues();
    this.stopSessionIds();
  }

  async finish(): Promise<{ sessionKey: string }> {
    const live = this.live;
    if (!live) {
      throw new Error("No session is being recorded.");
    }
    const ending = live.end();
    this.publish({ phase: "finishing" });
    try {
      await ending;
    } catch {
      // The sync status reports the storage failure; the server closes sessions left open.
    }
    this.close(live, IDLE);
    return { sessionKey: live.sessionKey };
  }

  getSnapshot = (): RecorderSnapshot => this.snapshot;

  mark(): string {
    const lastMark = this.requireRecording().mark();
    this.publish({ lastMark, markCount: this.snapshot.markCount + 1 });
    return lastMark.key;
  }

  pause(reason: "paused" | "hidden" = "paused"): void {
    this.pauseFor(reason);
  }

  async resume(): Promise<void> {
    const live = this.live;
    const { pauseReason, phase } = this.snapshot;
    if (!live || phase !== "paused" || pauseReason === "limit") {
      return;
    }
    this.publish({ failure: null, phase: "requesting" });
    const opening = await openVoice();
    if (this.live !== live) {
      opening.voice?.stop();
      return;
    }
    if (opening.failure) {
      this.publish({ failure: opening.failure, phase: "paused" });
      return;
    }
    live.resume(opening.voice);
    this.publish({ pauseReason: null, phase: "recording" });
  }

  async resumeDraft(sessionKey: string): Promise<void> {
    const drafts = await this.account.store.readDrafts(
      this.options.account.key
    );
    const draft = drafts.find(
      (candidate) =>
        candidate.sessionKey === sessionKey &&
        candidate.state !== "ended" &&
        candidate.state !== "cancelled"
    );
    if (!draft || this.isBusy()) {
      return;
    }
    const voice = await this.requestVoice();
    if (!voice) {
      return;
    }
    const gap = interruptedGap(draft);
    const live = this.adopt(draft, gap ? [...draft.gaps, gap] : draft.gaps);
    if (gap) {
      const { reason, startMs: atMs } = gap;
      live.persist({ action: "pause", atMs, kind: "collection", reason });
    }
    live.resume(voice);
    this.publish({ phase: "recording" });
  }

  select(element: Element, note?: string): void {
    this.requireRecording().select(element, cleanText(note, MAX_NOTE_CHARS));
  }

  async start(options: RecorderStartOptions): Promise<void> {
    if (this.isBusy()) {
      return;
    }
    const voice = await this.requestVoice();
    if (!voice) {
      return;
    }
    const draft = newSessionDraft({
      accountKey: this.options.account.key,
      continues: options.continues,
      detectSpeakers: options.detectSpeakers,
      surface: this.options.surface,
      title: cleanText(options.title, MAX_TITLE_CHARS) ?? "",
    });
    try {
      await this.account.store.writeDraft(draft);
      await this.account.outbox.enqueue(draft.sessionKey, startPayload(draft));
    } catch (error) {
      voice.stop();
      this.account.store.deleteDraft(draft.sessionKey).catch(() => undefined);
      const message = describeStorageFailure(error);
      this.publish({
        ...IDLE,
        failure: { kind: "storage", message },
        phase: "failed",
      });
      return;
    }
    const live = this.adopt(draft, []);
    live.startCollecting(voice);
    this.publish({ phase: "recording" });
    if (SURFACE_CAPTURE[this.options.surface].page) {
      live.captureEvidence({ trigger: "start" });
    }
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  subscribeLevel(listener: (level: number) => void): () => void {
    this.levelListeners.add(listener);
    return () => this.levelListeners.delete(listener);
  }

  private adopt(draft: StoredDraft, gaps: SessionGap[]): LiveSession {
    const { sessionKey, startedAt } = draft;
    const clock = createSessionClock({ gaps, startedAt });
    const live = new LiveSession({
      account: this.account,
      capture: SURFACE_CAPTURE[this.options.surface],
      clock,
      hooks: {
        onHidden: () => this.pauseFor("hidden"),
        onLevel: (level) => this.emitLevel(level),
        onPageHide: () => this.interrupt(),
        onSpeakers: (speakers) => {
          if (this.live === live) {
            this.publish({ speakers });
          }
        },
        onStorageFailure: (error) => this.failStorage(live, error),
        onTick: () => this.onTick(live),
        reachLimit: (limit) => this.reachLimit(live, limit),
      },
      limits: this.options.limits,
      sessionKey,
      speakers: draft.detectSpeakers
        ? {
            labelCount: draft.speakerLabelCount ?? 0,
            references: draft.speakerReferences ?? {},
            requestToken: requestSpeakerToken(this.options.api),
          }
        : null,
    });
    this.live = live;
    this.releaseClaim = this.account.claim({
      halt: (failure) => this.halt(failure),
      sessionKey,
    });
    this.publish({
      ...IDLE,
      activeMs: clock.activeMs(),
      sessionId: draft.sessionId,
      sessionKey,
      startedAt,
    });
    return live;
  }

  private close(live: LiveSession, next: RecorderSnapshot): void {
    live.stop();
    if (this.live === live) {
      this.live = null;
      this.releaseClaim();
    }
    this.emitLevel(0);
    this.publish(next);
    this.account.refreshDrafts();
  }

  private emitLevel(level: number): void {
    for (const listener of this.levelListeners) {
      listener(level);
    }
  }

  private failStorage(live: LiveSession, error: unknown): void {
    if (this.live !== live || this.snapshot.phase === "failed") {
      return;
    }
    live.stopCollecting();
    const message = describeStorageFailure(error);
    this.publish({ failure: { kind: "storage", message }, phase: "failed" });
  }

  private halt(failure: RecorderFailure): void {
    if (this.live) {
      this.close(this.live, { ...IDLE, failure, phase: "failed" });
    }
  }

  private readonly handleIssue = (issue: OutboxIssue): void => {
    const live = this.live;
    if (issue.kind === "auth" || issue.sessionKey !== live?.sessionKey) {
      return;
    }
    if (issue.kind === "sessionGone") {
      this.halt({ kind: "network", message: SESSION_GONE });
      return;
    }
    this.reachLimit(live, issue.limit);
  };

  private interrupt(): void {
    const live = this.live;
    if (!live) {
      this.publish(IDLE);
      return;
    }
    live.pause("interrupted");
    this.close(live, IDLE);
  }

  private isBusy(): boolean {
    return this.live !== null || this.snapshot.phase === "requesting";
  }

  private onTick(live: LiveSession): void {
    const { maxDurationMs, warnBeforeLimitMs } = this.options.limits;
    const activeMs = live.clock.activeMs();
    const nearLimit = activeMs >= maxDurationMs - warnBeforeLimitMs;
    this.publish({ activeMs, nearLimit });
    if (activeMs >= maxDurationMs) {
      this.reachLimit(live, "duration");
      return;
    }
    live.checkpoint();
  }

  private pauseFor(reason: "paused" | "hidden" | "limit"): void {
    const live = this.live;
    if (!live || this.snapshot.phase !== "recording") {
      return;
    }
    live.pause(reason);
    this.emitLevel(0);
    const activeMs = live.clock.activeMs();
    this.publish({ activeMs, pauseReason: reason, phase: "paused" });
  }

  private publish(next: Partial<RecorderSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...next };
    for (const listener of this.listeners) {
      listener();
    }
  }

  private reachLimit(live: LiveSession, limit: SessionLimitKind): void {
    if (this.live !== live) {
      return;
    }
    const { limitsReached } = this.snapshot;
    if (!limitsReached.includes(limit)) {
      this.publish({ limitsReached: [...limitsReached, limit] });
    }
    live.stopKind(limit);
    if (limit === "duration") {
      this.pauseFor("limit");
    }
  }

  private async requestVoice(): Promise<VoiceCapture | null> {
    this.publish({ ...IDLE, phase: "requesting" });
    const opening = await openVoice();
    if (opening.failure) {
      this.publish({ ...IDLE, failure: opening.failure, phase: "failed" });
    }
    return opening.voice;
  }

  private requireRecording(): LiveSession {
    if (!this.live || this.snapshot.phase !== "recording") {
      throw new Error("Nothing is being recorded right now.");
    }
    return this.live;
  }

  private readonly syncSessionId = (): void => {
    const sessionKey = this.live?.sessionKey;
    if (!sessionKey || this.snapshot.sessionId !== null) {
      return;
    }
    const draft = localSessions
      .getDrafts(this.options.account.key)
      .find((candidate) => candidate.sessionKey === sessionKey);
    if (draft?.sessionId) {
      this.publish({ sessionId: draft.sessionId });
    }
  };
}
