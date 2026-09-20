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
  blue: "Blue",
  brown: "Brown",
  default: "Default",
  gray: "Gray",
  green: "Green",
  orange: "Orange",
  pink: "Pink",
  purple: "Purple",
  red: "Red",
  yellow: "Yellow",
};

interface ColorValue {
  bg: string;
  text: string;
}

const NEUTRAL_VALUE: ColorValue = {
  bg: "var(--muted)",
  text: "var(--muted-foreground)",
};

function tagValue(name: string): ColorValue {
  return {
    bg: `color-mix(in oklab, var(--tag-${name}) 15%, transparent)`,
    text: `var(--tag-${name}-text)`,
  };
}

const COLOR_VALUES: Record<TagColor, ColorValue> = {
  blue: tagValue("blue"),
  brown: tagValue("brown"),
  default: NEUTRAL_VALUE,
  gray: NEUTRAL_VALUE,
  green: tagValue("green"),
  orange: tagValue("orange"),
  pink: tagValue("pink"),
  purple: tagValue("purple"),
  red: tagValue("red"),
  yellow: tagValue("yellow"),
};

export function isValidTagColor(color: string): color is TagColor {
  return TAG_COLORS.some((c) => c === color);
}

export function resolveTagColor(color: string): TagColor {
  if (isValidTagColor(color)) {
    return color;
  }
  return migrateHexToNamedColor(color);
}

export function getTagColorValues(color: string): ColorValue {
  return COLOR_VALUES[resolveTagColor(color)];
}

export function getTagTextColor(color: string): string {
  return getTagColorValues(color).text;
}

export function getTagDotColor(color: string): string {
  const resolved = resolveTagColor(color);
  if (resolved !== "default" || isValidTagColor(color)) {
    return getTagColorValues(resolved).text;
  }
  return color;
}

export function getRandomTagColor(): TagColor {
  const colors = TAG_COLORS.filter((c) => c !== "default");
  return colors[Math.floor(Math.random() * colors.length)] ?? "default";
}

// Dedicated tag palette classes for color swatches and dots
const TAG_SWATCH_CLASSES: Record<TagColor, string> = {
  blue: "bg-tag-blue border-tag-blue",
  brown: "bg-tag-brown border-tag-brown",
  default: "bg-muted border-border",
  gray: "bg-muted border-border",
  green: "bg-tag-green border-tag-green",
  orange: "bg-tag-orange border-tag-orange",
  pink: "bg-tag-pink border-tag-pink",
  purple: "bg-tag-purple border-tag-purple",
  red: "bg-tag-red border-tag-red",
  yellow: "bg-tag-yellow border-tag-yellow",
};

// Get Tailwind class for color swatch
export function getTagSwatchClass(color: string): string {
  const validColor = resolveTagColor(color);
  return TAG_SWATCH_CLASSES[validColor];
}

// Migration helper: convert old hex colors to new named colors
export function migrateHexToNamedColor(hexColor: string): TagColor {
  const hexMap: Record<string, TagColor> = {
    "#3b82f6": "blue",
    "#6b7280": "gray",
    "#8b5cf6": "purple",
    "#14b8a6": "green",
    "#22c55e": "green",
    "#a855f7": "purple",
    "#eab308": "yellow",
    "#ec4899": "pink",
    "#ef4444": "red",
    "#f97316": "orange",
  };
  return hexMap[hexColor.toLowerCase()] ?? "default";
}
