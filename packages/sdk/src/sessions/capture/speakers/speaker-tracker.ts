import type { SpeakerToken, SpeakerTurn } from "../../protocol";
import { SPEECH_SAMPLE_RATE } from "../audio/speech-chunker";
import { createSpeakerIdMap, type SpeakerLabels } from "./speaker-labels";
import { SpeakerTurns, speakerEventMs } from "./speaker-turns";
import {
  openRealtimeConnection,
  type RealtimeConnection,
  type RealtimeFailure,
} from "./stream/realtime-connection";
import { SampleQueue } from "./stream/sample-queue";

const SAMPLES_PER_MS = SPEECH_SAMPLE_RATE / 1000;
const PACE_INTERVAL_MS = 100;
const MAX_SAMPLES_PER_PACE = 125 * SAMPLES_PER_MS;
const MAX_QUEUED_SAMPLES = 30_000 * SAMPLES_PER_MS;
const FINISH_TIMEOUT_MS = 3000;
const RECONNECT_DELAYS_MS = [1000, 2000, 4000];

export interface SpeakerTrackerOptions {
  labels: SpeakerLabels;
  onUnavailable: () => void;
  references: () => Record<string, string>;
  requestToken: () => Promise<SpeakerToken | null>;
  startMs: number;
}

export class SpeakerTracker {
  private connection: RealtimeConnection | null = null;
  private failedAttempts = 0;
  private readonly finished: Promise<void>;
  private finishTimer: number | undefined;
  private isStreaming = false;
  private markFinished: () => void = () => undefined;
  private readonly options: SpeakerTrackerOptions;
  private readonly pacer: number;
  private readonly queue = new SampleQueue(MAX_QUEUED_SAMPLES);
  private reconnectTimer: number | undefined;
  private samplesSent = 0;
  private state: "running" | "finishing" | "stopped" = "running";
  private streamStartSample = 0;
  private readonly turns = new SpeakerTurns();

  constructor(options: SpeakerTrackerOptions) {
    this.options = options;
    this.finished = new Promise((resolve) => {
      this.markFinished = resolve;
    });
    this.pacer = window.setInterval(this.pace, PACE_INTERVAL_MS);
    this.connect();
  }

  close(): void {
    this.stop();
  }

  drain(): SpeakerTurn[] {
    return this.turns.drain();
  }

  finish(): Promise<void> {
    if (this.state === "running") {
      this.state = "finishing";
      this.finishTimer = window.setTimeout(this.stop, FINISH_TIMEOUT_MS);
      if (!this.isStreaming) {
        this.stop();
      }
    }
    return this.finished;
  }

  heardUntilMs(): number {
    return speakerEventMs({
      runStartMs: this.options.startMs,
      samplesSent: this.samplesSent,
      streamStartSample: this.streamStartSample,
    });
  }

  push(samples: Float32Array): void {
    if (this.state === "running" && !this.queue.push(samples)) {
      this.giveUp();
    }
  }

  takeTurnsOverlapping(range: {
    endMs: number;
    startMs: number;
  }): SpeakerTurn[] {
    return this.turns.takeTurnsOverlapping(range);
  }

  private readonly connect = (): void => {
    this.options
      .requestToken()
      .then((token) => (token ? this.open(token) : this.giveUp()))
      .catch(() => this.retry());
  };

  private giveUp(): void {
    if (this.state !== "stopped") {
      this.stop();
      this.options.onUnavailable();
    }
  }

  private lose(failure: RealtimeFailure): void {
    this.connection = null;
    this.isStreaming = false;
    if (this.state !== "running") {
      this.stop();
    } else if (failure.kind === "error") {
      this.giveUp();
    } else {
      this.retry();
    }
  }

  private readonly open = (token: SpeakerToken): void => {
    if (this.state !== "running") {
      return;
    }
    const references = this.options.references();
    const labelOf = createSpeakerIdMap(
      this.options.labels,
      Object.keys(references)
    );
    this.connection = openRealtimeConnection({
      onFailure: (failure) => this.lose(failure),
      onReady: () => {
        this.failedAttempts = 0;
        this.streamStartSample = this.samplesSent;
        this.isStreaming = true;
      },
      onSpeaker: (speakerId) =>
        this.turns.add(labelOf(speakerId), this.heardUntilMs()),
      references,
      token,
    });
  };

  private readonly pace = (): void => {
    const { connection } = this;
    if (!(connection && this.isStreaming)) {
      return;
    }
    const samples = this.queue.take(MAX_SAMPLES_PER_PACE);
    if (samples.length > 0) {
      connection.sendAudio(samples);
      this.samplesSent += samples.length;
    }
    if (this.state === "finishing" && this.queue.size === 0) {
      this.isStreaming = false;
      connection.end().then(this.stop, this.stop);
    }
  };

  private retry(): void {
    if (this.state !== "running") {
      return;
    }
    const delayMs = RECONNECT_DELAYS_MS[this.failedAttempts];
    if (delayMs === undefined) {
      this.giveUp();
      return;
    }
    this.failedAttempts += 1;
    this.reconnectTimer = window.setTimeout(this.connect, delayMs);
  }

  private readonly stop = (): void => {
    if (this.state === "stopped") {
      return;
    }
    this.state = "stopped";
    window.clearInterval(this.pacer);
    window.clearTimeout(this.reconnectTimer);
    window.clearTimeout(this.finishTimer);
    this.isStreaming = false;
    this.connection?.close();
    this.connection = null;
    this.queue.clear();
    this.markFinished();
  };
}
