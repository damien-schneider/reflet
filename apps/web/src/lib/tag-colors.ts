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

// Color values matching Tailwind palette (used by badge variants)
// Light mode: bg is *-50, text is *-600/700/800
// Dark mode: bg is *-400/10, text is *-400/500
interface ColorValue {
  bg: string;
  text: string;
  darkBg: string;
  darkText: string;
}

const COLOR_VALUES: Record<TagColor, ColorValue> = {
  default: {
    bg: "rgb(249 250 251)", // gray-50
    text: "rgb(75 85 99)", // gray-600
    darkBg: "rgba(156, 163, 175, 0.1)", // gray-400/10
    darkText: "rgb(156 163 175)", // gray-400
  },
  gray: {
    bg: "rgb(249 250 251)", // gray-50
    text: "rgb(75 85 99)", // gray-600
    darkBg: "rgba(156, 163, 175, 0.1)", // gray-400/10
    darkText: "rgb(156 163 175)", // gray-400
  },
  red: {
    bg: "rgb(254 242 242)", // red-50
    text: "rgb(185 28 28)", // red-700
    darkBg: "rgba(248, 113, 113, 0.1)", // red-400/10
    darkText: "rgb(248 113 113)", // red-400
  },
  orange: {
    bg: "rgb(255 247 237)", // orange-50
    text: "rgb(194 65 12)", // orange-700
    darkBg: "rgba(251, 146, 60, 0.1)", // orange-400/10
    darkText: "rgb(251 146 60)", // orange-400
  },
  yellow: {
    bg: "rgb(254 252 232)", // yellow-50
    text: "rgb(133 77 14)", // yellow-800
    darkBg: "rgba(250, 204, 21, 0.1)", // yellow-400/10
    darkText: "rgb(234 179 8)", // yellow-500
  },
  green: {
    bg: "rgb(240 253 244)", // green-50
    text: "rgb(21 128 61)", // green-700
    darkBg: "rgba(74, 222, 128, 0.1)", // green-400/10
    darkText: "rgb(74 222 128)", // green-400
  },
  blue: {
    bg: "rgb(239 246 255)", // blue-50
    text: "rgb(29 78 216)", // blue-700
    darkBg: "rgba(96, 165, 250, 0.1)", // blue-400/10
    darkText: "rgb(96 165 250)", // blue-400
  },
  purple: {
    bg: "rgb(250 245 255)", // purple-50
    text: "rgb(126 34 206)", // purple-700
    darkBg: "rgba(192, 132, 252, 0.1)", // purple-400/10
    darkText: "rgb(192 132 252)", // purple-400
  },
  pink: {
    bg: "rgb(253 242 248)", // pink-50
    text: "rgb(190 24 93)", // pink-700
    darkBg: "rgba(244, 114, 182, 0.1)", // pink-400/10
    darkText: "rgb(244 114 182)", // pink-400
  },
  brown: {
    bg: "rgb(255 251 235)", // amber-50
    text: "rgb(146 64 14)", // amber-800
    darkBg: "rgba(251, 191, 36, 0.1)", // amber-400/10
    darkText: "rgb(251 191 36)", // amber-400
  },
};

export function isValidTagColor(color: string): color is TagColor {
  return TAG_COLORS.includes(color as TagColor);
}

function getValidColor(color: string): TagColor {
  return isValidTagColor(color) ? color : "default";
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
    borderColor: text.replace("rgb(", "rgba(").replace(")", ", 0.3)"),
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

// Tailwind classes for tag text colors
const TAG_TEXT_CLASSES: Record<TagColor, string> = {
  default: "text-gray-600 dark:text-gray-400",
  gray: "text-gray-600 dark:text-gray-400",
  red: "text-red-700 dark:text-red-400",
  orange: "text-orange-700 dark:text-orange-400",
  yellow: "text-yellow-800 dark:text-yellow-500",
  green: "text-green-700 dark:text-green-400",
  blue: "text-blue-700 dark:text-blue-400",
  purple: "text-purple-700 dark:text-purple-400",
  pink: "text-pink-700 dark:text-pink-400",
  brown: "text-amber-800 dark:text-amber-400",
};

// Tailwind classes for color swatches
const TAG_SWATCH_CLASSES: Record<TagColor, string> = {
  default:
    "bg-gray-400/15 border-gray-400/25 dark:bg-gray-400/15 dark:border-gray-500/25",
  gray: "bg-gray-400/15 border-gray-400/25 dark:bg-gray-400/15 dark:border-gray-500/25",
  red: "bg-red-500/15 border-red-400/25 dark:bg-red-400/15 dark:border-red-500/25",
  orange:
    "bg-orange-500/15 border-orange-400/25 dark:bg-orange-400/15 dark:border-orange-500/25",
  yellow:
    "bg-yellow-500/15 border-yellow-400/25 dark:bg-yellow-400/15 dark:border-yellow-500/25",
  green:
    "bg-green-500/15 border-green-400/25 dark:bg-green-400/15 dark:border-green-500/25",
  blue: "bg-blue-500/15 border-blue-400/25 dark:bg-blue-400/15 dark:border-blue-500/25",
  purple:
    "bg-purple-500/15 border-purple-400/25 dark:bg-purple-400/15 dark:border-purple-500/25",
  pink: "bg-pink-500/15 border-pink-400/25 dark:bg-pink-400/15 dark:border-pink-500/25",
  brown:
    "bg-amber-800/15 border-amber-700/25 dark:bg-amber-600/15 dark:border-amber-500/25",
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
