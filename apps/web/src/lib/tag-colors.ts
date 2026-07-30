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

// Color values matching Notion's tag palette (used by badge variants)
interface ColorValue {
  bg: string;
  darkBg: string;
  darkText: string;
  text: string;
}

const COLOR_VALUES: Record<TagColor, ColorValue> = {
  blue: {
    bg: "#d3e5ef",
    darkBg: "rgba(82, 156, 202, 0.15)",
    darkText: "#5e87c9",
    text: "#0b6e99",
  },
  brown: {
    bg: "#eee0da",
    darkBg: "rgba(147, 114, 100, 0.15)",
    darkText: "#b4836d",
    text: "#64473a",
  },
  default: {
    bg: "#f1f1ef",
    darkBg: "rgba(255, 255, 255, 0.06)",
    darkText: "#9b9a97",
    text: "#787774",
  },
  gray: {
    bg: "#f1f1ef",
    darkBg: "rgba(255, 255, 255, 0.06)",
    darkText: "#9b9a97",
    text: "#787774",
  },
  green: {
    bg: "#dbeddb",
    darkBg: "rgba(77, 171, 154, 0.14)",
    darkText: "#529e72",
    text: "#0f7b6c",
  },
  orange: {
    bg: "#fadec9",
    darkBg: "rgba(255, 163, 68, 0.15)",
    darkText: "#c77d48",
    text: "#d9730d",
  },
  pink: {
    bg: "#f5e0e9",
    darkBg: "rgba(226, 85, 161, 0.15)",
    darkText: "#b65590",
    text: "#ad1a72",
  },
  purple: {
    bg: "#e8deee",
    darkBg: "rgba(154, 109, 215, 0.15)",
    darkText: "#9a6dd7",
    text: "#6940a5",
  },
  red: {
    bg: "#ffe2dd",
    darkBg: "rgba(234, 87, 82, 0.15)",
    darkText: "#df5452",
    text: "#e03e3e",
  },
  yellow: {
    bg: "#fdecc8",
    darkBg: "rgba(255, 220, 73, 0.14)",
    darkText: "#c29343",
    text: "#dfab01",
  },
};

export function isValidTagColor(color: string): color is TagColor {
  return TAG_COLORS.some((c) => c === color);
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
    borderColor: `${text}4d`,
    color: text,
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
      borderColor: `${text}30`,
      color: text,
    };
  }
  return {
    backgroundColor: `${color}15`,
    borderColor: `${color}30`,
    color,
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
  return colors[Math.floor(Math.random() * colors.length)] ?? "default";
}

// Tailwind classes for tag text colors (Notion-style)
const TAG_TEXT_CLASSES: Record<TagColor, string> = {
  blue: "text-[#0b6e99] dark:text-[#5e87c9]",
  brown: "text-[#64473a] dark:text-[#b4836d]",
  default: "text-[#787774] dark:text-[#9b9a97]",
  gray: "text-[#787774] dark:text-[#9b9a97]",
  green: "text-[#0f7b6c] dark:text-[#529e72]",
  orange: "text-[#d9730d] dark:text-[#c77d48]",
  pink: "text-[#ad1a72] dark:text-[#b65590]",
  purple: "text-[#6940a5] dark:text-[#9a6dd7]",
  red: "text-[#e03e3e] dark:text-[#df5452]",
  yellow: "text-[#dfab01] dark:text-[#c29343]",
};

// Tailwind classes for color swatches (Notion-style)
const TAG_SWATCH_CLASSES: Record<TagColor, string> = {
  blue: "bg-[#d3e5ef] border-[#0b6e9933] dark:bg-[#529cca26] dark:border-[#5e87c933]",
  brown:
    "bg-[#eee0da] border-[#64473a33] dark:bg-[#93726426] dark:border-[#b4836d33]",
  default:
    "bg-[#f1f1ef] border-[#78777433] dark:bg-[#ffffff0f] dark:border-[#9b9a9733]",
  gray: "bg-[#f1f1ef] border-[#78777433] dark:bg-[#ffffff0f] dark:border-[#9b9a9733]",
  green:
    "bg-[#dbeddb] border-[#0f7b6c33] dark:bg-[#4dab9a24] dark:border-[#529e7233]",
  orange:
    "bg-[#fadec9] border-[#d9730d33] dark:bg-[#ffa34426] dark:border-[#c77d4833]",
  pink: "bg-[#f5e0e9] border-[#ad1a7233] dark:bg-[#e255a126] dark:border-[#b6559033]",
  purple:
    "bg-[#e8deee] border-[#6940a533] dark:bg-[#9a6dd726] dark:border-[#9a6dd733]",
  red: "bg-[#ffe2dd] border-[#e03e3e33] dark:bg-[#ea575226] dark:border-[#df545233]",
  yellow:
    "bg-[#fdecc8] border-[#dfab0133] dark:bg-[#ffdc4924] dark:border-[#c2934333]",
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
