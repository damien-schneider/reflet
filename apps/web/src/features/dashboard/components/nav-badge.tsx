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
        "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-medium text-caption tabular-nums",
        tone === "attention"
          ? "bg-brand text-brand-foreground group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-1 group-data-[collapsible=icon]:right-1 group-data-[collapsible=icon]:size-2 group-data-[collapsible=icon]:min-w-0 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:text-transparent group-data-[collapsible=icon]:ring-2 group-data-[collapsible=icon]:ring-sidebar"
          : "bg-muted text-muted-foreground group-data-[collapsible=icon]:hidden"
      )}
    >
      {count > MAX_VISIBLE_COUNT ? `${MAX_VISIBLE_COUNT}+` : count}
    </span>
  );
}
