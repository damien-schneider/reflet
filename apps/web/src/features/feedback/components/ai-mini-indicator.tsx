import { Sparkle } from "@phosphor-icons/react";

import { TagBadge } from "@/components/tag-badge";

const AI_INDICATOR_COLORS: Record<string, string> = {
  complex: "orange",
  critical: "red",
  high: "orange",
  low: "blue",
  medium: "yellow",
  moderate: "yellow",
  needs_review: "orange",
  none: "gray",
  simple: "blue",
  trivial: "green",
  very_complex: "red",
};

export function AiMiniIndicator({
  label,
  type,
  isAiValue = true,
}: {
  label: string;
  type: string;
  isAiValue?: boolean;
}) {
  const color = AI_INDICATOR_COLORS[type] ?? "gray";
  return (
    <TagBadge color={color}>
      {isAiValue && (
        <>
          <Sparkle aria-hidden className="opacity-60" weight="fill" />
          <span className="sr-only">AI suggested: </span>
        </>
      )}
      <span className="first-letter:uppercase">{label}</span>
    </TagBadge>
  );
}
