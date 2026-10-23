import type { SpeakerTurn } from "../../protocol";
import { SPEECH_SAMPLE_RATE } from "../audio/speech-chunker";

export const STREAMING_DELAY_MS = 480;
const EVENT_ARRIVAL_LAG_MS = 250;
const SAMPLES_PER_MS = SPEECH_SAMPLE_RATE / 1000;

export function speakerEventMs(stream: {
  runStartMs: number;
  samplesSent: number;
  streamStartSample: number;
}): number {
  const sentMs = stream.samplesSent / SAMPLES_PER_MS;
  const streamStartMs = stream.streamStartSample / SAMPLES_PER_MS;
  const spokenMs = sentMs - STREAMING_DELAY_MS - EVENT_ARRIVAL_LAG_MS;
  return Math.round(stream.runStartMs + Math.max(streamStartMs, spokenMs));
}

interface OpenTurn extends SpeakerTurn {
  undrainedFromMs: number | null;
}

export class SpeakerTurns {
  private closed: SpeakerTurn[] = [];
  private open: OpenTurn | null = null;
  private undrained: SpeakerTurn[] = [];

  add(speaker: string | null, atMs: number): void {
    const { open } = this;
    if (open !== null && open.speaker === speaker) {
      open.undrainedFromMs ??= open.endMs;
      open.endMs = atMs;
      return;
    }
    this.closeOpenTurn();
    this.open =
      speaker === null
        ? null
        : { endMs: atMs, speaker, startMs: atMs, undrainedFromMs: atMs };
  }

  drain(): SpeakerTurn[] {
    const drained = this.undrained;
    this.undrained = [];
    const { open } = this;
    if (open && open.undrainedFromMs !== null) {
      drained.push(undrainedPart(open, open.undrainedFromMs));
      open.undrainedFromMs = null;
    }
    return drained;
  }

  takeTurnsOverlapping(range: {
    endMs: number;
    startMs: number;
  }): SpeakerTurn[] {
    const { open } = this;
    const candidates = open ? [...this.closed, wholeTurn(open)] : this.closed;
    this.closed = this.closed.filter((turn) => turn.endMs > range.endMs);
    return candidates.filter(
      (turn) => turn.startMs < range.endMs && turn.endMs > range.startMs
    );
  }

  private closeOpenTurn(): void {
    const { open } = this;
    if (open === null) {
      return;
    }
    if (open.undrainedFromMs !== null) {
      this.undrained.push(undrainedPart(open, open.undrainedFromMs));
    }
    this.closed.push(wholeTurn(open));
    this.open = null;
  }
}

function undrainedPart(turn: OpenTurn, fromMs: number): SpeakerTurn {
  return { endMs: turn.endMs, speaker: turn.speaker, startMs: fromMs };
}

function wholeTurn(turn: OpenTurn): SpeakerTurn {
  return { endMs: turn.endMs, speaker: turn.speaker, startMs: turn.startMs };
}
