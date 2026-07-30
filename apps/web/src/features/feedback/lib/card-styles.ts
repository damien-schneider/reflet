import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { ComponentType } from "react";
import { EditorialFeedFeedCard } from "../components/card-designs/editorial-feed-card";
import { MinimalNotchFeedCard } from "../components/card-designs/minimal-notch-card";
import { SweepCornerFeedCard } from "../components/card-designs/sweep-corner-card";
import type { FeedbackItem } from "../components/feed-feedback-view";

export interface FeedCardProps {
  className?: string;
  feedback: FeedbackItem;
  onClick?: (feedbackId: Id<"feedback">) => void;
}

export type CardStyle = "sweep-corner" | "minimal-notch" | "editorial-feed";

export const DEFAULT_CARD_STYLE: CardStyle = "minimal-notch";

export const CARD_STYLE_OPTIONS = [
  {
    description: "Clean layout with a left-edge notch vote indicator.",
    label: "Minimal Notch",
    value: "minimal-notch" as const,
  },
  {
    description: "Corner vote badge with a sweep animation on click.",
    label: "Sweep Corner",
    value: "sweep-corner" as const,
  },
  {
    description: "Rich editorial layout with author details and inline voting.",
    label: "Editorial Feed",
    value: "editorial-feed" as const,
  },
] as const;

const CARD_COMPONENTS: Record<CardStyle, ComponentType<FeedCardProps>> = {
  "editorial-feed": EditorialFeedFeedCard,
  "minimal-notch": MinimalNotchFeedCard,
  "sweep-corner": SweepCornerFeedCard,
};

export function getCardComponent(
  style: CardStyle
): ComponentType<FeedCardProps> {
  return CARD_COMPONENTS[style];
}
