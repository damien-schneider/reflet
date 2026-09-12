import { Badge, type BadgeProps } from "@ctrl-ui/react/ui/badge";
import { resolveTagColor, type TagColor } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

const SKIN_COLOR: Record<TagColor, BadgeProps["color"]> = {
  blue: "blue",
  brown: "neutral",
  default: "neutral",
  gray: "neutral",
  green: "green",
  orange: "orange",
  pink: "pink",
  purple: "purple",
  red: "red",
  yellow: "yellow",
};

type TagBadgeProps = Omit<BadgeProps, "color"> & { color?: string };

export function TagBadge({ color, className, ...props }: TagBadgeProps) {
  const resolved = resolveTagColor(color ?? "default");

  return (
    <Badge
      className={cn(resolved === "brown" && "tag-badge-brown", className)}
      color={SKIN_COLOR[resolved]}
      {...props}
    />
  );
}
