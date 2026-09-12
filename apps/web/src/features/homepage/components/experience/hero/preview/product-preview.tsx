import { type Ref, useId } from "react";

export type ProductMoment = keyof typeof CARD_POSITIONS;

const CARD_POSITIONS = {
  idea: {
    idea: "translate(0 0)",
    plan: "translate(0 0)",
    release: "translate(0 0)",
  },
  plan: {
    idea: "translate(-12 55)",
    plan: "translate(-80 45)",
    release: "translate(0 15)",
  },
  release: {
    idea: "translate(-12 -18)",
    plan: "translate(8 -8)",
    release: "translate(-72 -92)",
  },
};

const CARD_ORDER = {
  idea: ["plan", "idea", "release"],
  plan: ["idea", "release", "plan"],
  release: ["plan", "idea", "release"],
} as const;

export function ProductPreview({
  previewRef,
  moment = "idea",
}: {
  previewRef?: Ref<SVGSVGElement>;
  moment?: ProductMoment;
}) {
  const id = useId();
  const shadow = `url(#${id}-shadow)`;
  return (
    <svg
      aria-labelledby={`${id}-title`}
      data-moment={moment}
      fill="none"
      height="430"
      ref={previewRef}
      role="img"
      viewBox="0 0 660 430"
      width="660"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id={`${id}-title`}>
        An idea becomes a planned feature, then a release that reaches the
        people who asked.
      </title>
      <defs>
        <filter
          height="150%"
          id={`${id}-shadow`}
          width="150%"
          x="-25%"
          y="-20%"
        >
          <feDropShadow
            dx="0"
            dy="14"
            floodColor="var(--marketing-shadow-color)"
            floodOpacity="0.13"
            stdDeviation="16"
          />
          <feDropShadow
            dx="0"
            dy="2"
            floodColor="var(--marketing-shadow-color)"
            floodOpacity="0.08"
            stdDeviation="2"
          />
        </filter>
        <linearGradient id={`${id}-surface`} x1="0" x2="0.7" y1="0" y2="1">
          <stop stopColor="var(--card)" />
          <stop offset="1" stopColor="var(--secondary)" />
        </linearGradient>
      </defs>
      <g
        fill="var(--foreground)"
        fontFamily="var(--font-sans), sans-serif"
        fontSize="12"
      >
        {CARD_ORDER[moment].map((card) => (
          <g
            className="hero-preview-card"
            key={card}
            transform={CARD_POSITIONS[moment][card]}
          >
            {card === "plan" && (
              <ProductRoadmap shadow={shadow} surface={`url(#${id}-surface)`} />
            )}
            {card === "idea" && <ProductIdea shadow={shadow} />}
            {card === "release" && <ProductReply shadow={shadow} />}
          </g>
        ))}
      </g>
    </svg>
  );
}

function ProductRoadmap({
  shadow,
  surface,
}: {
  shadow: string;
  surface: string;
}) {
  return (
    <g transform="rotate(5 417 166)">
      <rect
        fill={surface}
        filter={shadow}
        height="278"
        rx="26"
        stroke="var(--marketing-edge)"
        width="358"
        x="230"
        y="24"
      />
      <circle
        cx="259"
        cy="55"
        fill="none"
        r="7"
        stroke="var(--foreground)"
        strokeWidth="2.5"
      />
      <text fontSize="15" fontWeight="600" x="277" y="60">
        Product roadmap
      </text>
      <path
        d="M546 54h12m-6-6v12"
        fill="none"
        stroke="var(--muted-foreground)"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
      <path d="M252 79h312" stroke="var(--marketing-hairline)" />
      <circle
        cx="259"
        cy="103"
        fill="none"
        r="4"
        stroke="var(--marketing-violet)"
        strokeWidth="1.5"
      />
      <text fill="var(--muted-foreground)" x="272" y="107">
        Planned
      </text>
      <rect
        fill="var(--card)"
        height="76"
        rx="14"
        width="312"
        x="253"
        y="123"
      />
      <text fontSize="15" fontWeight="500" x="272" y="150">
        A workspace that feels like you
      </text>
      <text fill="var(--muted-foreground)" x="272" y="177">
        Personal dashboard
      </text>
      <rect
        fill="var(--card)"
        height="67"
        rx="14"
        width="312"
        x="253"
        y="210"
      />
      <text fontSize="14" x="272" y="238">
        Pick up where you left off
      </text>
      <text fill="var(--muted-foreground)" x="272" y="258">
        Saved views
      </text>
    </g>
  );
}

function ProductIdea({ shadow }: { shadow: string }) {
  return (
    <g transform="rotate(-4 269 226)">
      <rect
        fill="var(--card)"
        filter={shadow}
        height="234"
        rx="26"
        stroke="var(--marketing-edge)"
        width="414"
        x="52"
        y="113"
      />
      <rect
        fill="var(--secondary)"
        height="29"
        rx="10"
        width="129"
        x="76"
        y="136"
      />
      <circle cx="91" cy="150" fill="var(--marketing-amber)" r="3.5" />
      <text fill="var(--muted-foreground)" fontSize="11" x="102" y="154">
        Feature request
      </text>
      <path
        d="M423 146h2m5 0h2m5 0h2"
        fill="none"
        stroke="var(--muted-foreground)"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <text fontSize="26" fontWeight="500" letterSpacing="-0.8" x="76" y="202">
        Save my favorite views
      </text>
      <text fill="var(--muted-foreground)" fontSize="14" x="76" y="231">
        “I’d love to pick up right where I left off.”
      </text>
      <path d="M76 256h366" stroke="var(--marketing-hairline)" />
      <circle cx="91" cy="286" fill="var(--secondary)" r="15" />
      <text
        fill="var(--muted-foreground)"
        fontSize="12"
        textAnchor="middle"
        x="91"
        y="290"
      >
        M
      </text>
      <text fontSize="12" x="115" y="282">
        Maya
      </text>
      <text fill="var(--muted-foreground)" fontSize="10" x="115" y="299">
        A little idea, just now
      </text>
      <rect
        fill="var(--secondary)"
        height="32"
        rx="11"
        width="79"
        x="362"
        y="271"
      />
      <path
        d="m375 288 4-4 4 4"
        fill="none"
        stroke="var(--marketing-violet)"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
      <text fill="var(--marketing-violet)" fontSize="11" x="392" y="291">
        Vote
      </text>
    </g>
  );
}

function ProductReply({ shadow }: { shadow: string }) {
  return (
    <g transform="rotate(2 444 355)">
      <rect
        fill="var(--card)"
        filter={shadow}
        height="70"
        rx="21"
        stroke="var(--marketing-edge)"
        width="333"
        x="277"
        y="317"
      />
      <rect
        fill="var(--marketing-green-soft)"
        height="38"
        rx="13"
        width="38"
        x="293"
        y="333"
      />
      <path
        d="m304 352 5 5 11-12"
        fill="none"
        stroke="var(--marketing-green)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <text fontSize="14" fontWeight="500" x="345" y="347">
        You asked. We shipped.
      </text>
      <text fill="var(--muted-foreground)" fontSize="11" x="345" y="366">
        Saved views are here.
      </text>
      <path
        d="M578 348h10v10m-10 0 10-10"
        fill="none"
        stroke="var(--muted-foreground)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </g>
  );
}
