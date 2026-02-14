// Top-level regex for hex color parsing
const HEX_COLOR_REGEX = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
// Regex for validating hex colors (3 or 6 digit)
const HEX_VALIDATION_REGEX = /^#?([a-f\d]{3}|[a-f\d]{6})$/i;

/**
 * Converts a hex color to HSL values
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = HEX_COLOR_REGEX.exec(hex);
  if (!result) {
    return { h: 0, s: 0, l: 50 };
  }

  const r = Number.parseInt(result[1] ?? "0", 16) / 255;
  const g = Number.parseInt(result[2] ?? "0", 16) / 255;
  const b = Number.parseInt(result[3] ?? "0", 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / d + 2) / 6;
    } else if (max === b) {
      h = ((r - g) / d + 4) / 6;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Converts HSL values to a hex color
 */
function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (val: number): string => {
    const hex = Math.round((val + m) * 255).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Determines if a color is light or dark based on relative luminance
 */
function isLightColor(hex: string): boolean {
  const result = HEX_COLOR_REGEX.exec(hex);
  if (!result) {
    return false;
  }

  const r = Number.parseInt(result[1] ?? "0", 16);
  const g = Number.parseInt(result[2] ?? "0", 16);
  const b = Number.parseInt(result[3] ?? "0", 16);

  // Calculate relative luminance using sRGB formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

export interface ColorPalette {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryForeground: string;
}

/**
 * Generates a color palette from a primary hex color
 * Returns CSS custom property values for theming
 */
export function generateColorPalette(primaryHex: string): ColorPalette {
  const normalizedHex = primaryHex.startsWith("#")
    ? primaryHex
    : `#${primaryHex}`;
  const hsl = hexToHsl(normalizedHex);

  // Primary: the original color
  const primary = normalizedHex;

  // Hover: 10% darker
  const hoverLightness = Math.max(0, hsl.l - 10);
  const primaryHover = hslToHex(hsl.h, hsl.s, hoverLightness);

  // Light: very light version for backgrounds (90-95% lightness)
  const lightLightness = Math.min(95, Math.max(90, 95 - hsl.s * 0.1));
  const primaryLight = hslToHex(hsl.h, Math.min(hsl.s, 30), lightLightness);

  // Foreground: white for dark colors, black for light colors
  const primaryForeground = isLightColor(normalizedHex) ? "#000000" : "#ffffff";

  return {
    primary,
    primaryHover,
    primaryLight,
    primaryForeground,
  };
}

/**
 * Generates CSS custom properties object from a color palette
 */
export function generateColorCssVars(
  palette: ColorPalette
): Record<string, string> {
  return {
    "--color-primary": palette.primary,
    "--color-primary-hover": palette.primaryHover,
    "--color-primary-light": palette.primaryLight,
    "--color-primary-foreground": palette.primaryForeground,
  };
}

/**
 * Validates a hex color string
 */
export function isValidHexColor(color: string): boolean {
  return HEX_VALIDATION_REGEX.test(color);
}

/**
 * Normalizes a hex color to 6-digit format with #
 */
export function normalizeHexColor(color: string): string {
  let hex = color.replace("#", "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return `#${hex}`;
}
