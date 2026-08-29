"use client";

import { useFollowedRequest } from "../board-store";
import type { BoardItem } from "../landing-data";

const PROMISE: Record<BoardItem["status"], { many: string; one: string }> = {
  "In progress": {
    many: "people hear back the day it ships.",
    one: "person hears back the day it ships.",
  },
  Planned: {
    many: "people get the changelog when it lands.",
    one: "person gets the changelog when it lands.",
  },
  Shipped: {
    many: "people heard back the day it shipped.",
    one: "person heard back the day it shipped.",
  },
  "Under review": {
    many: "people find out the moment it is decided.",
    one: "person finds out the moment it is decided.",
  },
};

export default function BoardAnswers() {
  const { item, votes } = useFollowedRequest();
  const promise = PROMISE[item.status];

  return (
    <div aria-live="polite">
      <a
        className="hero-animate hero-fade-in hero-delay-0 group flex max-w-140 items-baseline font-display text-[22px] text-foreground/85 leading-tight tracking-tight transition-colors hover:text-foreground sm:text-[26px]"
        href="#collect"
        key={`${item.id}-${votes}`}
      >
        <span className="underline decoration-[1.5px] decoration-olive-600/80 underline-offset-[7px] transition-colors group-hover:decoration-olive-600 dark:decoration-olive-400/80 dark:group-hover:decoration-olive-400">
          <span className="text-foreground tabular-nums">{votes}</span>
          {` ${votes === 1 ? promise.one : promise.many}`}
        </span>
      </a>
    </div>
  );
}
