/**
 * Generate changelog widget CSS styles
 */
export function getChangelogStyles(
  primaryColor: string,
  zIndex: number,
  theme: "light" | "dark"
): string {
  const isDark = theme === "dark";

  const colors = {
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

  return `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .reflet-changelog-container {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: ${colors.text};
    }

    /* ==================== CARD MODE ==================== */

    .reflet-changelog-card {
      position: fixed;
      z-index: ${zIndex};
      max-width: 320px;
      background: ${colors.bg};
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
      border: 1px solid ${colors.border};
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      overflow: hidden;
    }

    .reflet-changelog-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.16);
    }

    .reflet-changelog-card.bottom-right {
      bottom: 24px;
      right: 24px;
    }

    .reflet-changelog-card.bottom-left {
      bottom: 24px;
      left: 24px;
    }

    .reflet-changelog-card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: ${colors.primary};
      color: white;
    }

    .reflet-changelog-card-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .reflet-changelog-card-label {
      font-size: 13px;
      font-weight: 600;
      flex: 1;
    }

    .reflet-changelog-card-badge {
      background: ${colors.newBadge};
      color: white;
      font-size: 11px;
      font-weight: 600;
      padding: 1px 7px;
      border-radius: 10px;
    }

    .reflet-changelog-card-body {
      padding: 12px 16px;
    }

    .reflet-changelog-card-title {
      font-size: 14px;
      font-weight: 600;
      color: ${colors.text};
      margin-bottom: 4px;
    }

    .reflet-changelog-card-version {
      font-size: 12px;
      color: ${colors.textMuted};
    }

    .reflet-changelog-card-dismiss {
      position: absolute;
      top: 8px;
      right: 8px;
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      padding: 2px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
    }

    .reflet-changelog-card-dismiss:hover {
      color: white;
      background: rgba(255, 255, 255, 0.15);
    }

    .reflet-changelog-card-dismiss svg {
      width: 14px;
      height: 14px;
    }

    /* ==================== POPUP / TRIGGER PANEL ==================== */

    .reflet-changelog-overlay {
      position: fixed;
      inset: 0;
      z-index: ${zIndex};
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .reflet-changelog-panel {
      z-index: ${zIndex + 1};
      width: 420px;
      max-width: calc(100vw - 32px);
      max-height: 520px;
      background: ${colors.bg};
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid ${colors.border};
    }

    .reflet-changelog-panel.popup {
      /* Centered via overlay flex */
    }

    .reflet-changelog-panel.trigger {
      position: absolute;
    }

    .reflet-changelog-panel-header {
      padding: 16px 20px;
      background: ${colors.primary};
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .reflet-changelog-panel-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .reflet-changelog-panel-icon {
      width: 22px;
      height: 22px;
    }

    .reflet-changelog-panel-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }

    .reflet-changelog-close-btn {
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .reflet-changelog-close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .reflet-changelog-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;
    }

    .reflet-changelog-entry {
      padding: 16px 20px;
      border-bottom: 1px solid ${colors.border};
      cursor: pointer;
      transition: background 0.15s;
    }

    .reflet-changelog-entry:last-child {
      border-bottom: none;
    }

    .reflet-changelog-entry:hover {
      background: ${colors.bgSecondary};
    }

    .reflet-changelog-entry-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .reflet-changelog-entry-version {
      font-size: 12px;
      font-weight: 600;
      color: ${colors.primary};
      background: ${colors.primaryLight};
      padding: 2px 8px;
      border-radius: 4px;
    }

    .reflet-changelog-entry-date {
      font-size: 12px;
      color: ${colors.textMuted};
    }

    .reflet-changelog-entry-new {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      font-weight: 600;
      color: ${colors.newBadge};
    }

    .reflet-changelog-entry-title {
      font-size: 15px;
      font-weight: 600;
      color: ${colors.text};
      margin-bottom: 4px;
    }

    .reflet-changelog-entry-description {
      font-size: 13px;
      color: ${colors.textMuted};
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .reflet-changelog-entry-feedback {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .reflet-changelog-entry-feedback-item {
      font-size: 11px;
      color: ${colors.primary};
      background: ${colors.primaryLight};
      padding: 2px 8px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* ==================== SHARED ==================== */

    .reflet-changelog-footer {
      padding: 10px 16px;
      border-top: 1px solid ${colors.border};
      text-align: center;
      font-size: 12px;
      color: ${colors.textMuted};
      flex-shrink: 0;
    }

    .reflet-changelog-footer a {
      color: ${colors.primary};
      text-decoration: none;
    }

    .reflet-changelog-footer a:hover {
      text-decoration: underline;
    }

    .reflet-changelog-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }

    .reflet-changelog-spinner {
      width: 28px;
      height: 28px;
      border: 3px solid ${colors.border};
      border-top-color: ${colors.primary};
      border-radius: 50%;
      animation: reflet-changelog-spin 0.8s linear infinite;
    }

    @keyframes reflet-changelog-spin {
      to { transform: rotate(360deg); }
    }

    .reflet-changelog-empty {
      text-align: center;
      padding: 40px 20px;
      color: ${colors.textMuted};
    }

    .reflet-changelog-empty-icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 16px;
      opacity: 0.5;
    }

    .reflet-changelog-error {
      text-align: center;
      padding: 20px;
      color: ${colors.error};
      background: ${isDark ? "rgba(239, 68, 68, 0.1)" : "#fef2f2"};
      border-radius: 8px;
      margin: 16px 20px;
    }

    .reflet-changelog-retry-btn {
      margin-top: 12px;
      padding: 8px 16px;
      background: ${colors.primary};
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }

    .reflet-changelog-retry-btn:hover {
      background: ${colors.primaryHover};
    }
  `;
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

function adjustBrightness(hex: string, percent: number): string {
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
