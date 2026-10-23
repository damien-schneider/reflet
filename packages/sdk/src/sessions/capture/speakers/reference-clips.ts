import type { SpeakerTurn } from "../../protocol";
import { SPEECH_SAMPLE_RATE, type SpeechChunk } from "../audio/speech-chunker";
import { encodeWav } from "../audio/wav";
import { bytesToBase64 } from "./stream/base64";

const SAMPLES_PER_MS = SPEECH_SAMPLE_RATE / 1000;
const MIN_PIECE_MS = 1000;
const MIN_REFERENCE_SAMPLES = 3000 * SAMPLES_PER_MS;
const MAX_REFERENCE_SAMPLES = 6000 * SAMPLES_PER_MS;
const PIECE_END_MARGIN_MS = 250;
const MAX_REFERENCES = 8;

interface VoiceSample {
  pieces: Float32Array[];
  samples: number;
}

export function referencePiece(
  chunk: SpeechChunk,
  turn: SpeakerTurn
): Float32Array | null {
  const fromMs = Math.max(turn.startMs, chunk.startMs);
  const toMs = Math.min(turn.endMs - PIECE_END_MARGIN_MS, chunk.endMs);
  if (toMs - fromMs < MIN_PIECE_MS) {
    return null;
  }
  return chunk.samples.slice(
    Math.round((fromMs - chunk.startMs) * SAMPLES_PER_MS),
    Math.round((toMs - chunk.startMs) * SAMPLES_PER_MS)
  );
}

function joined(voice: VoiceSample): Float32Array {
  const samples = new Float32Array(voice.samples);
  let offset = 0;
  for (const piece of voice.pieces) {
    samples.set(piece, offset);
    offset += piece.length;
  }
  return samples;
}

function becameUsable(before: number, after: number): boolean {
  return (
    (before < MIN_REFERENCE_SAMPLES && after >= MIN_REFERENCE_SAMPLES) ||
    (before < MAX_REFERENCE_SAMPLES && after >= MAX_REFERENCE_SAMPLES)
  );
}

export class ReferenceClips {
  private readonly saved: Record<string, string>;
  private readonly voices = new Map<string, VoiceSample>();

  constructor(saved: Record<string, string>) {
    this.saved = saved;
  }

  keepFrom(chunk: SpeechChunk, turns: SpeakerTurn[]): boolean {
    let changed = false;
    for (const turn of turns) {
      const voice = this.voices.get(turn.speaker) ?? { pieces: [], samples: 0 };
      const room = MAX_REFERENCE_SAMPLES - voice.samples;
      const isSaved = turn.speaker in this.saved;
      const piece = room > 0 && !isSaved ? referencePiece(chunk, turn) : null;
      if (piece) {
        const kept = piece.subarray(0, room);
        const before = voice.samples;
        voice.pieces.push(kept);
        voice.samples += kept.length;
        this.voices.set(turn.speaker, voice);
        changed ||= becameUsable(before, voice.samples);
      }
    }
    return changed;
  }

  references(): Record<string, string> {
    const references: Record<string, string> = { ...this.saved };
    for (const [speaker, voice] of this.voices) {
      if (voice.samples >= MIN_REFERENCE_SAMPLES) {
        references[speaker] = bytesToBase64(
          encodeWav(joined(voice), SPEECH_SAMPLE_RATE)
        );
      }
    }
    return Object.fromEntries(
      Object.entries(references).slice(0, MAX_REFERENCES)
    );
  }
}
