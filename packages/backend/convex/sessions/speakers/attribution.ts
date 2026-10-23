import type { Infer } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import type { speakerTurnValidator } from "../validators";

export type SpeakerTurn = Infer<typeof speakerTurnValidator>;

export interface SpokenRun {
  speaker: string | null;
  text: string;
}

type AttributedSegment = Pick<
  Doc<"sessionSegments">,
  "endMs" | "source" | "startMs" | "text" | "words"
>;

const NEAREST_TURN_TOLERANCE_MS = 1500;
const TURN_END_UNCERTAINTY_MS = 250;
const STARTS_WITH_LETTER_OR_DIGIT = /^[\p{L}\p{N}]/u;

const turnsNear = (
  segment: AttributedSegment,
  turns: SpeakerTurn[]
): SpeakerTurn[] =>
  turns.filter(
    (turn) =>
      turn.endMs >= segment.startMs - NEAREST_TURN_TOLERANCE_MS &&
      turn.startMs <= segment.endMs + NEAREST_TURN_TOLERANCE_MS
  );

const speakerAt = (atMs: number, turns: SpeakerTurn[]): string | null => {
  let previous: SpeakerTurn | null = null;
  for (const turn of turns) {
    if (turn.endMs >= atMs - TURN_END_UNCERTAINTY_MS) {
      if (turn.startMs - atMs <= NEAREST_TURN_TOLERANCE_MS) {
        return turn.speaker;
      }
      break;
    }
    previous = turn;
  }
  return previous && atMs - previous.endMs <= NEAREST_TURN_TOLERANCE_MS
    ? previous.speaker
    : null;
};

const longestSpeaker = (
  segment: AttributedSegment,
  turns: SpeakerTurn[]
): string | null => {
  const spokenMs = new Map<string, number>();
  for (const turn of turns) {
    const overlapMs =
      Math.min(segment.endMs, turn.endMs) -
      Math.max(segment.startMs, turn.startMs);
    if (overlapMs > 0) {
      spokenMs.set(turn.speaker, (spokenMs.get(turn.speaker) ?? 0) + overlapMs);
    }
  }
  let longest: { ms: number; speaker: string } | null = null;
  for (const [speaker, ms] of spokenMs) {
    if (longest === null || ms > longest.ms) {
      longest = { ms, speaker };
    }
  }
  return longest?.speaker ?? null;
};

const runsByWord = (
  text: string,
  words: { speaker: string | null; textOffset: number }[]
): SpokenRun[] => {
  const starts = words
    .filter(
      (word, index) => index === 0 || words[index - 1]?.speaker !== word.speaker
    )
    .map((word, index) => (index === 0 ? { ...word, textOffset: 0 } : word));
  return starts
    .map((start, index) => ({
      speaker: start.speaker,
      text: text.slice(start.textOffset, starts[index + 1]?.textOffset).trim(),
    }))
    .filter((run) => run.text !== "");
};

export const segmentSpeech = (
  segment: AttributedSegment,
  turns: SpeakerTurn[]
): SpokenRun[] | null => {
  const text = segment.text.trim();
  if (segment.source === "typed" || text === "") {
    return null;
  }
  const near = turnsNear(segment, turns);
  if (near.length === 0) {
    return null;
  }
  if (!segment.words || segment.words.length === 0) {
    const speaker = longestSpeaker(segment, near);
    return speaker === null ? null : [{ speaker, text }];
  }
  let previousSpeaker: string | null = null;
  return runsByWord(
    segment.text,
    segment.words.map((word) => {
      const startsWithPunctuation = !STARTS_WITH_LETTER_OR_DIGIT.test(
        segment.text.slice(word.textOffset)
      );
      const speaker = startsWithPunctuation
        ? previousSpeaker
        : speakerAt(word.endMs, near);
      previousSpeaker = speaker;
      return { speaker, textOffset: word.textOffset };
    })
  );
};
