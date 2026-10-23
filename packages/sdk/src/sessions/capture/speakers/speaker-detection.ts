import type { SpeakerToken, SpeakerTurn } from "../../protocol";
import type { SpeechChunk } from "../audio/speech-chunker";
import { ReferenceClips } from "./reference-clips";
import { SpeakerLabels } from "./speaker-labels";
import { SpeakerTracker } from "./speaker-tracker";

const REFERENCE_SETTLE_MS = 1000;
const MAX_UNSETTLED_CHUNKS = 3;

export type SpeakerDetectionState = "off" | "detecting" | "unavailable";

export interface SpeakerDetectionOptions {
  labelCount: number;
  onLabelCount: (count: number) => void;
  onReferences: (references: Record<string, string>) => void;
  onState: (state: Exclude<SpeakerDetectionState, "off">) => void;
  references: Record<string, string>;
  requestToken: () => Promise<SpeakerToken | null>;
}

export class SpeakerDetection {
  private readonly clips: ReferenceClips;
  private readonly labels: SpeakerLabels;
  private readonly options: SpeakerDetectionOptions;
  private run: SpeakerTracker | null = null;
  private readonly unsettled: SpeechChunk[] = [];
  private previousRunSettled: Promise<void> = Promise.resolve();

  constructor(options: SpeakerDetectionOptions) {
    this.options = options;
    this.clips = new ReferenceClips(options.references);
    this.labels = new SpeakerLabels({
      handedOut: options.labelCount,
      onHandOut: options.onLabelCount,
    });
  }

  closeRun(): SpeakerTurn[] {
    const { run } = this;
    this.run = null;
    if (!run) {
      return [];
    }
    run.close();
    this.keepVoices(run, this.unsettled.splice(0));
    return run.drain();
  }

  drainTurns(): SpeakerTurn[] {
    return this.run?.drain() ?? [];
  }

  async finishRun(): Promise<SpeakerTurn[]> {
    const { run } = this;
    this.run = null;
    if (!run) {
      return [];
    }
    const unsettled = this.unsettled.splice(0);
    const settled = run.finish().then(() => this.keepVoices(run, unsettled));
    this.previousRunSettled = settled;
    await settled;
    return run.drain();
  }

  keepReferences(chunk: SpeechChunk): void {
    if (this.run) {
      this.unsettled.push(chunk);
      this.settleReferences();
    }
  }

  settleReferences(): void {
    const { run } = this;
    if (!run) {
      return;
    }
    const heardMs = run.heardUntilMs();
    const overflow = this.unsettled.length - MAX_UNSETTLED_CHUNKS;
    const firstUnsettled = this.unsettled.findIndex(
      (chunk, index) =>
        index >= overflow && chunk.endMs + REFERENCE_SETTLE_MS > heardMs
    );
    const settledCount =
      firstUnsettled === -1 ? this.unsettled.length : firstUnsettled;
    this.keepVoices(run, this.unsettled.splice(0, settledCount));
  }

  readonly pushSamples = (samples: Float32Array): void => {
    this.run?.push(samples);
  };

  startRun(startMs: number): void {
    const { previousRunSettled } = this;
    this.run = new SpeakerTracker({
      labels: this.labels,
      onUnavailable: () => this.options.onState("unavailable"),
      references: () => this.clips.references(),
      requestToken: async () => {
        await previousRunSettled;
        return await this.options.requestToken();
      },
      startMs,
    });
    this.options.onState("detecting");
  }

  private keepVoices(run: SpeakerTracker, chunks: SpeechChunk[]): void {
    let changed = false;
    for (const chunk of chunks) {
      changed =
        this.clips.keepFrom(chunk, run.takeTurnsOverlapping(chunk)) || changed;
    }
    if (changed) {
      this.options.onReferences(this.clips.references());
    }
  }
}
