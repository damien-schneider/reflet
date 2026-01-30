/**
 * Generate widget CSS styles
 */
export function getWidgetStyles(
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
    success: "#22c55e",
    error: "#ef4444",
  };

  return `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .reflet-feedback-container {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: ${colors.text};
    }

    /* Floating Launcher Button */
    .reflet-launcher {
      position: fixed;
      z-index: ${zIndex};
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: ${colors.primary};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .reflet-launcher:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }

    .reflet-launcher.bottom-right {
      bottom: 24px;
      right: 24px;
    }

    .reflet-launcher.bottom-left {
      bottom: 24px;
      left: 24px;
    }

    .reflet-launcher-icon {
      color: white;
      width: 24px;
      height: 24px;
    }

    .reflet-launcher-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: ${colors.error};
      color: white;
      font-size: 11px;
      font-weight: 600;
      min-width: 20px;
      height: 20px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 6px;
    }

    /* Main Window */
    .reflet-window {
      position: fixed;
      z-index: ${zIndex + 1};
      width: 400px;
      max-width: calc(100vw - 48px);
      height: 600px;
      max-height: calc(100vh - 48px);
      background: ${colors.bg};
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .reflet-window.bottom-right {
      bottom: 96px;
      right: 24px;
    }

    .reflet-window.bottom-left {
      bottom: 96px;
      left: 24px;
    }

    /* Inline Mode */
    .reflet-window.inline {
      position: relative;
      width: 100%;
      height: auto;
      min-height: 400px;
      max-height: none;
      box-shadow: none;
      border: 1px solid ${colors.border};
    }

    /* Header */
    .reflet-header {
      padding: 16px;
      background: ${colors.primary};
      color: white;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .reflet-header-content {
      flex: 1;
    }

    .reflet-header-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }

    .reflet-header-subtitle {
      font-size: 13px;
      opacity: 0.9;
      margin-top: 4px;
    }

    .reflet-close-btn {
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

    .reflet-close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    /* Navigation */
    .reflet-nav {
      display: flex;
      border-bottom: 1px solid ${colors.border};
      background: ${colors.bgSecondary};
      flex-shrink: 0;
    }

    .reflet-nav-item {
      flex: 1;
      padding: 12px;
      background: transparent;
      border: none;
      color: ${colors.textMuted};
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      border-bottom: 2px solid transparent;
      transition: color 0.2s, border-color 0.2s;
    }

    .reflet-nav-item:hover {
      color: ${colors.text};
    }

    .reflet-nav-item.active {
      color: ${colors.primary};
      border-bottom-color: ${colors.primary};
    }

    /* Content Area */
    .reflet-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    /* Feedback List */
    .reflet-feedback-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .reflet-feedback-card {
      background: ${colors.bg};
      border: 1px solid ${colors.border};
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .reflet-feedback-card:hover {
      border-color: ${colors.primary};
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .reflet-feedback-title {
      font-size: 15px;
      font-weight: 600;
      color: ${colors.text};
      margin-bottom: 8px;
    }

    .reflet-feedback-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 13px;
      color: ${colors.textMuted};
    }

    .reflet-feedback-status {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .reflet-feedback-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    /* Vote Button */
    .reflet-vote-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 8px 12px;
      background: ${colors.bgSecondary};
      border: 1px solid ${colors.border};
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      min-width: 48px;
    }

    .reflet-vote-btn:hover {
      border-color: ${colors.primary};
      background: ${adjustBrightness(colors.primary, 90)};
    }

    .reflet-vote-btn.voted {
      background: ${colors.primary};
      border-color: ${colors.primary};
      color: white;
    }

    .reflet-vote-count {
      font-size: 14px;
      font-weight: 600;
    }

    .reflet-vote-icon {
      width: 16px;
      height: 16px;
    }

    /* Create Feedback Form */
    .reflet-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .reflet-form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .reflet-form-label {
      font-size: 13px;
      font-weight: 500;
      color: ${colors.text};
    }

    .reflet-form-input,
    .reflet-form-textarea {
      padding: 10px 12px;
      border: 1px solid ${colors.border};
      border-radius: 8px;
      font-size: 14px;
      background: ${colors.bg};
      color: ${colors.text};
      transition: border-color 0.2s;
    }

    .reflet-form-input:focus,
    .reflet-form-textarea:focus {
      outline: none;
      border-color: ${colors.primary};
    }

    .reflet-form-textarea {
      resize: vertical;
      min-height: 120px;
    }

    .reflet-submit-btn {
      padding: 12px 24px;
      background: ${colors.primary};
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .reflet-submit-btn:hover {
      background: ${colors.primaryHover};
    }

    .reflet-submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Loading State */
    .reflet-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }

    .reflet-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid ${colors.border};
      border-top-color: ${colors.primary};
      border-radius: 50%;
      animation: reflet-spin 0.8s linear infinite;
    }

    @keyframes reflet-spin {
      to { transform: rotate(360deg); }
    }

    /* Empty State */
    .reflet-empty {
      text-align: center;
      padding: 40px 20px;
      color: ${colors.textMuted};
    }

    .reflet-empty-icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 16px;
      opacity: 0.5;
    }

    /* Error State */
    .reflet-error {
      text-align: center;
      padding: 20px;
      color: ${colors.error};
      background: ${isDark ? "rgba(239, 68, 68, 0.1)" : "#fef2f2"};
      border-radius: 8px;
    }

    /* Login Prompt */
    .reflet-login-prompt {
      text-align: center;
      padding: 20px;
      background: ${colors.bgSecondary};
      border-radius: 8px;
    }

    .reflet-login-btn {
      margin-top: 12px;
      padding: 10px 20px;
      background: ${colors.primary};
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }

    /* Comments */
    .reflet-comments {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .reflet-comment {
      padding: 12px;
      background: ${colors.bgSecondary};
      border-radius: 8px;
    }

    .reflet-comment-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .reflet-comment-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: ${colors.border};
    }

    .reflet-comment-author {
      font-weight: 500;
      font-size: 13px;
    }

    .reflet-comment-time {
      font-size: 12px;
      color: ${colors.textMuted};
    }

    .reflet-comment-body {
      font-size: 14px;
      line-height: 1.6;
    }

    .reflet-comment-official {
      border-left: 3px solid ${colors.primary};
    }

    /* Footer */
    .reflet-footer {
      padding: 12px 16px;
      border-top: 1px solid ${colors.border};
      text-align: center;
      font-size: 12px;
      color: ${colors.textMuted};
      flex-shrink: 0;
    }

    .reflet-footer a {
      color: ${colors.primary};
      text-decoration: none;
    }

    .reflet-footer a:hover {
      text-decoration: underline;
    }

    /* Back Button */
    .reflet-back-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 0;
      background: transparent;
      border: none;
      color: ${colors.textMuted};
      cursor: pointer;
      font-size: 13px;
      margin-bottom: 12px;
    }

    .reflet-back-btn:hover {
      color: ${colors.text};
    }

    /* Tags */
    .reflet-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .reflet-tag {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
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
