import { Badge, type BadgeProps } from "@ctrl-ui/react/ui/badge";
import type { TagColor } from "@reflet/backend/convex/feedback/tag_colors";
import { getTagColorValues, resolveTagColor } from "@/lib/tag-colors";

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

function tagKnobs(
  color: TagColor,
  variant: BadgeProps["variant"]
): BadgeProps["style"] {
  if (color === "default" || color === "gray") {
    return;
  }
  const { bg, text } = getTagColorValues(color);
  if (variant === "outline") {
    return { "--cui-badge-foreground": text };
  }
  return { "--cui-badge-background": bg, "--cui-badge-foreground": text };
}

export function TagBadge({ color, style, variant, ...props }: TagBadgeProps) {
  const resolved = resolveTagColor(color ?? "default");

  return (
    <Badge
      color={SKIN_COLOR[resolved]}
      style={{ ...tagKnobs(resolved, variant), ...style }}
      variant={variant}
      {...props}
    />
  );
}
