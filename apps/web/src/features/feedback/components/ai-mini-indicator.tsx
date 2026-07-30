import { Sparkle } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";

const AI_INDICATOR_COLORS: Record<string, string> = {
  complex: "orange",
  critical: "red",
  high: "orange",
  low: "blue",
  medium: "yellow",
  moderate: "yellow",
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
    <Badge
      className="h-5 gap-0.5 rounded-full px-1.5 font-normal text-[10px]"
      color={color}
    >
      {isAiValue && (
        <Sparkle className="h-2.5 w-2.5 opacity-60" weight="fill" />
      )}
      <span className="capitalize">{label}</span>
    </Badge>
  );
}
