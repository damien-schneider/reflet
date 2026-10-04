import type { QuestionType } from "@reflet/survey-core";

interface GlyphShape {
  color: string;
  dots: readonly (readonly [number, number])[];
  trail: string;
}

const GLYPHS: Record<QuestionType, GlyphShape> = {
  boolean: {
    color: "var(--color-rose-500)",
    dots: [
      [6, 14],
      [21, 7],
      [21, 21],
    ],
    trail: "M6 14 C13 14 14 7 21 7 M6 14 C13 14 14 21 21 21",
  },
  multiple_choice: {
    color: "var(--color-sky-500)",
    dots: [
      [6, 7],
      [6, 14],
      [6, 21],
      [22, 7],
      [22, 14],
    ],
    trail: "M6 7 H22 M6 14 H22 M6 21 H16",
  },
  nps: {
    color: "var(--color-blue-500)",
    dots: [
      [4, 19],
      [8, 10],
      [14, 6],
      [20, 10],
      [24, 19],
    ],
    trail: "M4 19 A10 10 0 0 1 24 19",
  },
  rating: {
    color: "var(--color-amber-500)",
    dots: [
      [14, 4],
      [23.5, 11],
      [20, 22],
      [8, 22],
      [4.5, 11],
    ],
    trail: "M14 4 L20 22 L4.5 11 H23.5 L8 22 Z",
  },
  single_choice: {
    color: "var(--color-violet-500)",
    dots: [
      [6, 7],
      [6, 14],
      [6, 21],
      [22, 14],
    ],
    trail: "M6 14 H22",
  },
  statement: {
    color: "var(--color-orange-500)",
    dots: [
      [14, 5],
      [23, 14],
      [14, 23],
      [5, 14],
      [14, 14],
    ],
    trail: "M14 5 A9 9 0 1 1 13.9 5",
  },
  text: {
    color: "var(--color-emerald-500)",
    dots: [
      [5, 8],
      [5, 14],
      [5, 20],
    ],
    trail: "M5 8 H23 M5 14 H19 M5 20 H14",
  },
};

/** A small dotted mark that tells question types apart at a glance. */
export function StepGlyph({
  className,
  type,
}: {
  className?: string;
  type: QuestionType;
}) {
  const glyph = GLYPHS[type];
  return (
    <svg aria-hidden className={className} fill="none" viewBox="0 0 28 28">
      <path
        d={glyph.trail}
        opacity={0.28}
        stroke={glyph.color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3}
      />
      {glyph.dots.map(([cx, cy]) => (
        <circle
          cx={cx}
          cy={cy}
          fill={glyph.color}
          key={`${cx}-${cy}`}
          r={2.2}
        />
      ))}
    </svg>
  );
}
