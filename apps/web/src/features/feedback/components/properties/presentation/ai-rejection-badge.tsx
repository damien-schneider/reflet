import { Sparkle } from "@phosphor-icons/react";
import type { ComponentProps } from "react";
import { TagBadge } from "@/components/tag-badge";

type AiRejectionBadgeProps = Omit<
  ComponentProps<typeof TagBadge>,
  "children" | "color"
> & {
  probability: number;
};

export function AiRejectionBadge({
  probability,
  ...props
}: AiRejectionBadgeProps) {
  const percentage = Math.round(probability * 100);
  const assessmentLabel = `AI junk risk: ${percentage}%`;
  return (
    <TagBadge
      {...props}
      aria-label={assessmentLabel}
      color="red"
      title={assessmentLabel}
    >
      <Sparkle aria-hidden className="size-3" />
      <span>Junk risk:</span>
      {percentage}%
    </TagBadge>
  );
}
