import { Fragment, useState } from "react";

const WORD_GAP = /\s+/;
const WORD_STAGGER_MS = 35;
const MAX_REVEAL_SPREAD_MS = 900;

function wordsOf(text: string): string[] {
  return text.trim().split(WORD_GAP);
}

function sharedLeadingWords(
  before: readonly string[],
  after: readonly string[]
): number {
  const firstChange = after.findIndex((word, index) => word !== before[index]);
  return firstChange === -1 ? after.length : firstChange;
}

export function RevealedWords({
  isNew,
  text,
}: {
  isNew: boolean;
  text: string;
}) {
  const words = wordsOf(text);
  const [reveal, setReveal] = useState(() => ({
    from: isNew ? 0 : words.length,
    text,
  }));
  const from =
    reveal.text === text
      ? reveal.from
      : sharedLeadingWords(wordsOf(reveal.text), words);
  if (reveal.text !== text) {
    setReveal({ from, text });
  }
  const staggerMs = Math.min(
    WORD_STAGGER_MS,
    MAX_REVEAL_SPREAD_MS / Math.max(words.length - from, 1)
  );
  return words.map((word, index) => {
    const isRevealed = index >= from;
    return (
      // biome-ignore lint/suspicious/noArrayIndexKey: words never reorder; a word at a new place is a new word to reveal
      <Fragment key={`${index}:${word}`}>
        {index > 0 && " "}
        <span
          data-reveal={isRevealed || undefined}
          style={
            isRevealed
              ? {
                  animationDelay: `${Math.round((index - from) * staggerMs)}ms`,
                }
              : undefined
          }
        >
          {word}
        </span>
      </Fragment>
    );
  });
}
