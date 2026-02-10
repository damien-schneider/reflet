export interface ChangelogColors {
  bg: string;
  bgSecondary: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  error: string;
  newBadge: string;
}

export function createChangelogColors(
  primaryColor: string,
  isDark: boolean
): ChangelogColors {
  return {
    bg: isDark ? "#1a1a2e" : "#ffffff",
    bgSecondary: isDark ? "#16213e" : "#f8fafc",
    text: isDark ? "#e2e8f0" : "#1e293b",
    textMuted: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
    primary: primaryColor,
    primaryHover: adjustBrightness(primaryColor, isDark ? 20 : -10),
    primaryLight: isDark
      ? adjustBrightness(primaryColor, -60)
      : adjustBrightness(primaryColor, 80),
    error: "#ef4444",
    newBadge: "#f59e0b",
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
