import type { ComponentType } from "react";

import { EditorialFeedFeedCard } from "../components/card-designs/editorial-feed-card";
import { MinimalNotchFeedCard } from "../components/card-designs/minimal-notch-card";
import { SweepCornerFeedCard } from "../components/card-designs/sweep-corner-card";

export type CardStyle = "sweep-corner" | "minimal-notch" | "editorial-feed";

export const DEFAULT_CARD_STYLE: CardStyle = "minimal-notch";

export const CARD_STYLE_OPTIONS = [
  {
    value: "minimal-notch" as const,
    label: "Minimal Notch",
    description: "Clean layout with a left-edge notch vote indicator.",
  },
  {
    value: "sweep-corner" as const,
    label: "Sweep Corner",
    description: "Corner vote badge with a sweep animation on click.",
  },
  {
    value: "editorial-feed" as const,
    label: "Editorial Feed",
    description: "Rich editorial layout with author details and inline voting.",
  },
] as const;

// biome-ignore lint/suspicious/noExplicitAny: card components have varied but compatible prop interfaces
const CARD_COMPONENTS: Record<CardStyle, ComponentType<any>> = {
  "sweep-corner": SweepCornerFeedCard,
  "minimal-notch": MinimalNotchFeedCard,
  "editorial-feed": EditorialFeedFeedCard,
};

// biome-ignore lint/suspicious/noExplicitAny: returns polymorphic card component
export function getCardComponent(style: CardStyle): ComponentType<any> {
  return CARD_COMPONENTS[style];
}
