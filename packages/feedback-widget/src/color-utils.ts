export interface WidgetColors {
  bg: string;
  bgSecondary: string;
  border: string;
  error: string;
  errorBg: string;
  hairline: string;
  onPrimary: string;
  onPrimaryOverlay: string;
  onPrimarySoft: string;
  primary: string;
  primaryHover: string;
  shadow: string;
  shadowSoft: string;
  success: string;
  text: string;
  textMuted: string;
}

export const DEFAULT_STATUS_COLOR = "#6b7280";
export const DEFAULT_PRIMARY_COLOR = "#6366f1";

export function createWidgetColors(
  primaryColor: string,
  isDark: boolean
): WidgetColors {
  return {
    bg: isDark ? "#1a1a2e" : "#ffffff",
    bgSecondary: isDark ? "#16213e" : "#f8fafc",
    border: isDark ? "#334155" : "#e2e8f0",
    error: "#ef4444",
    errorBg: isDark ? "rgb(239 68 68 / 10%)" : "#fef2f2",
    hairline: isDark ? "rgb(255 255 255 / 10%)" : "rgb(0 0 0 / 10%)",
    onPrimary: "#ffffff",
    onPrimaryOverlay: "rgb(255 255 255 / 12%)",
    onPrimarySoft: "rgb(255 255 255 / 30%)",
    primary: primaryColor,
    primaryHover: adjustBrightness(primaryColor, isDark ? 20 : -10),
    shadow: isDark ? "rgb(0 0 0 / 45%)" : "rgb(0 0 0 / 15%)",
    shadowSoft: isDark ? "rgb(0 0 0 / 35%)" : "rgb(0 0 0 / 6%)",
    success: "#22c55e",
    text: isDark ? "#e2e8f0" : "#1e293b",
    textMuted: isDark ? "#94a3b8" : "#64748b",
  };
}

function clampColorChannel(value: number): number {
  if (value < 1) {
    return 0;
  }
  if (value > 255) {
    return 255;
  }
  return value;
}

export function adjustBrightness(hex: string, percent: number): string {
  const num = Number.parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  // biome-ignore lint/suspicious/noBitwiseOperators: intentional for RGB extraction
  const R = clampColorChannel((num >> 16) + amt);
  // biome-ignore lint/suspicious/noBitwiseOperators: intentional for RGB extraction
  const G = clampColorChannel(((num >> 8) & 0x00_ff) + amt);
  // biome-ignore lint/suspicious/noBitwiseOperators: intentional for RGB extraction
  const B = clampColorChannel((num & 0x00_00_ff) + amt);

  return `#${(0x1_00_00_00 + R * 0x1_00_00 + G * 0x1_00 + B).toString(16).slice(1)}`;
}
