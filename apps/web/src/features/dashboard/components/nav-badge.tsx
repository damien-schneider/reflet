import { cn } from "@ctrl-ui/react/lib/cn";

const MAX_VISIBLE_COUNT = 99;

interface NavBadgeProps {
  count: number;
  tone: "attention" | "neutral";
}

export function NavBadge({ count, tone }: NavBadgeProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-medium text-caption tabular-nums group-data-[collapsible=icon]:hidden",
        tone === "attention"
          ? "bg-brand text-brand-foreground"
          : "bg-muted text-muted-foreground"
      )}
    >
      {count > MAX_VISIBLE_COUNT ? `${MAX_VISIBLE_COUNT}+` : count}
    </span>
  );
}
