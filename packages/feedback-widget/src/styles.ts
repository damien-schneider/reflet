/**
 * Generate widget CSS styles
 */
import { adjustBrightness, createWidgetColors } from "./color-utils";
import { getLayoutStyles } from "./styles-layout";

export function getWidgetStyles(
  primaryColor: string,
  zIndex: number,
  theme: "light" | "dark"
): string {
  const isDark = theme === "dark";
  const colors = createWidgetColors(primaryColor, isDark);

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

    ${getLayoutStyles(colors, zIndex)}

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
