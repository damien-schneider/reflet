export const TAG_COLORS = [
  "default",
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
] as const;

export type TagColor = (typeof TAG_COLORS)[number];

export const TAG_COLOR_LABELS: Record<TagColor, string> = {
  default: "Default",
  gray: "Gray",
  brown: "Brown",
  orange: "Orange",
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
  purple: "Purple",
  pink: "Pink",
  red: "Red",
};

export function getTagColorStyles(color: string): React.CSSProperties {
  const validColor = TAG_COLORS.includes(color as TagColor) ? color : "default";
  return {
    backgroundColor: `rgb(var(--tag-${validColor}-bg))`,
    color: `rgb(var(--tag-${validColor}-text))`,
    borderColor: `rgb(var(--tag-${validColor}-text) / 0.3)`,
  };
}

export function isValidTagColor(color: string): color is TagColor {
  return TAG_COLORS.includes(color as TagColor);
}

// Migration helper: convert old hex colors to new named colors
export function migrateHexToNamedColor(hexColor: string): TagColor {
  const hexMap: Record<string, TagColor> = {
    "#ef4444": "red",
    "#f97316": "orange",
    "#eab308": "yellow",
    "#22c55e": "green",
    "#14b8a6": "green",
    "#3b82f6": "blue",
    "#8b5cf6": "purple",
    "#a855f7": "purple",
    "#ec4899": "pink",
    "#6b7280": "gray",
  };
  return hexMap[hexColor.toLowerCase()] ?? "default";
}

// Get just the text color CSS value for a named color
export function getTagTextColor(color: string): string {
  const validColor = TAG_COLORS.includes(color as TagColor) ? color : "default";
  return `rgb(var(--tag-${validColor}-text))`;
}
