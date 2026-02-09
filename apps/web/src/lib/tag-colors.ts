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

// Color values matching Notion's tag palette (used by badge variants)
interface ColorValue {
  bg: string;
  text: string;
  darkBg: string;
  darkText: string;
}

const COLOR_VALUES: Record<TagColor, ColorValue> = {
  default: {
    bg: "#f1f1ef",
    text: "#787774",
    darkBg: "rgba(255, 255, 255, 0.06)",
    darkText: "#9b9a97",
  },
  gray: {
    bg: "#f1f1ef",
    text: "#787774",
    darkBg: "rgba(255, 255, 255, 0.06)",
    darkText: "#9b9a97",
  },
  red: {
    bg: "#ffe2dd",
    text: "#e03e3e",
    darkBg: "rgba(234, 87, 82, 0.15)",
    darkText: "#df5452",
  },
  orange: {
    bg: "#fadec9",
    text: "#d9730d",
    darkBg: "rgba(255, 163, 68, 0.15)",
    darkText: "#c77d48",
  },
  yellow: {
    bg: "#fdecc8",
    text: "#dfab01",
    darkBg: "rgba(255, 220, 73, 0.14)",
    darkText: "#c29343",
  },
  green: {
    bg: "#dbeddb",
    text: "#0f7b6c",
    darkBg: "rgba(77, 171, 154, 0.14)",
    darkText: "#529e72",
  },
  blue: {
    bg: "#d3e5ef",
    text: "#0b6e99",
    darkBg: "rgba(82, 156, 202, 0.15)",
    darkText: "#5e87c9",
  },
  purple: {
    bg: "#e8deee",
    text: "#6940a5",
    darkBg: "rgba(154, 109, 215, 0.15)",
    darkText: "#9a6dd7",
  },
  pink: {
    bg: "#f5e0e9",
    text: "#ad1a72",
    darkBg: "rgba(226, 85, 161, 0.15)",
    darkText: "#b65590",
  },
  brown: {
    bg: "#eee0da",
    text: "#64473a",
    darkBg: "rgba(147, 114, 100, 0.15)",
    darkText: "#b4836d",
  },
};

export function isValidTagColor(color: string): color is TagColor {
  return TAG_COLORS.includes(color as TagColor);
}

// Resolve any color (named or legacy hex) to a TagColor.
// Tries named match first, then hex-to-named migration, then falls back to "default".
function resolveTagColor(color: string): TagColor {
  if (isValidTagColor(color)) {
    return color;
  }
  return migrateHexToNamedColor(color);
}

function getValidColor(color: string): TagColor {
  return resolveTagColor(color);
}

// Get color values for a tag color
export function getTagColorValues(
  color: string,
  isDark = false
): { bg: string; text: string } {
  const validColor = getValidColor(color);
  const values = COLOR_VALUES[validColor];
  return isDark
    ? { bg: values.darkBg, text: values.darkText }
    : { bg: values.bg, text: values.text };
}

// Get CSS styles for inline styling (used by components that can't use Tailwind classes)
export function getTagColorStyles(
  color: string,
  isDark = false
): React.CSSProperties {
  const { bg, text } = getTagColorValues(color, isDark);
  return {
    backgroundColor: bg,
    color: text,
    borderColor: `${text}4d`,
  };
}

// Get badge-style CSS properties for any color (named tag color or hex).
// Named colors and known hex colors use the Notion palette; unknown hex colors fall back to alpha variants.
export function getColorBadgeStyles(color: string): React.CSSProperties {
  const resolved = resolveTagColor(color);
  if (resolved !== "default" || isValidTagColor(color)) {
    const { bg, text } = getTagColorValues(resolved);
    return {
      backgroundColor: bg,
      color: text,
      borderColor: `${text}30`,
    };
  }
  return {
    backgroundColor: `${color}15`,
    color,
    borderColor: `${color}30`,
  };
}

// Get just the background color
export function getTagBgColor(color: string, isDark = false): string {
  return getTagColorValues(color, isDark).bg;
}

// Get just the text color
export function getTagTextColor(color: string, isDark = false): string {
  return getTagColorValues(color, isDark).text;
}

// Get a solid representative color for small dots/indicators
// Works with named colors, legacy hex values, and unknown hex values
export function getTagDotColor(color: string, isDark = false): string {
  const resolved = resolveTagColor(color);
  if (resolved !== "default" || isValidTagColor(color)) {
    return getTagColorValues(resolved, isDark).text;
  }
  return color;
}

// Get a random named tag color (excludes "default")
export function getRandomTagColor(): TagColor {
  const colors = TAG_COLORS.filter((c) => c !== "default");
  return colors[Math.floor(Math.random() * colors.length)];
}

// Tailwind classes for tag text colors (Notion-style)
const TAG_TEXT_CLASSES: Record<TagColor, string> = {
  default: "text-[#787774] dark:text-[#9b9a97]",
  gray: "text-[#787774] dark:text-[#9b9a97]",
  red: "text-[#e03e3e] dark:text-[#df5452]",
  orange: "text-[#d9730d] dark:text-[#c77d48]",
  yellow: "text-[#dfab01] dark:text-[#c29343]",
  green: "text-[#0f7b6c] dark:text-[#529e72]",
  blue: "text-[#0b6e99] dark:text-[#5e87c9]",
  purple: "text-[#6940a5] dark:text-[#9a6dd7]",
  pink: "text-[#ad1a72] dark:text-[#b65590]",
  brown: "text-[#64473a] dark:text-[#b4836d]",
};

// Tailwind classes for color swatches (Notion-style)
const TAG_SWATCH_CLASSES: Record<TagColor, string> = {
  default:
    "bg-[#f1f1ef] border-[#78777433] dark:bg-[#ffffff0f] dark:border-[#9b9a9733]",
  gray: "bg-[#f1f1ef] border-[#78777433] dark:bg-[#ffffff0f] dark:border-[#9b9a9733]",
  red: "bg-[#ffe2dd] border-[#e03e3e33] dark:bg-[#ea575226] dark:border-[#df545233]",
  orange:
    "bg-[#fadec9] border-[#d9730d33] dark:bg-[#ffa34426] dark:border-[#c77d4833]",
  yellow:
    "bg-[#fdecc8] border-[#dfab0133] dark:bg-[#ffdc4924] dark:border-[#c2934333]",
  green:
    "bg-[#dbeddb] border-[#0f7b6c33] dark:bg-[#4dab9a24] dark:border-[#529e7233]",
  blue: "bg-[#d3e5ef] border-[#0b6e9933] dark:bg-[#529cca26] dark:border-[#5e87c933]",
  purple:
    "bg-[#e8deee] border-[#6940a533] dark:bg-[#9a6dd726] dark:border-[#9a6dd733]",
  pink: "bg-[#f5e0e9] border-[#ad1a7233] dark:bg-[#e255a126] dark:border-[#b6559033]",
  brown:
    "bg-[#eee0da] border-[#64473a33] dark:bg-[#93726426] dark:border-[#b4836d33]",
};

// Get Tailwind class for tag text color
export function getTagTextClass(color: string): string {
  const validColor = getValidColor(color);
  return TAG_TEXT_CLASSES[validColor];
}

// Get Tailwind class for color swatch
export function getTagSwatchClass(color: string): string {
  const validColor = getValidColor(color);
  return TAG_SWATCH_CLASSES[validColor];
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
