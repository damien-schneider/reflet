import { adjustBrightness, createWidgetColors } from "./color-utils";
import { getFormStyles } from "./styles-form";
import { getLayoutStyles } from "./styles-layout";
import { getSurveyStyles } from "./styles-survey";

export function getWidgetStyles(
  primaryColor: string,
  theme: "light" | "dark"
): string {
  const colors = createWidgetColors(primaryColor, theme === "dark");

  return `
    :host {
      all: initial;
      display: block;
      color-scheme: ${theme};
    }

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

    button {
      font: inherit;
      transition: scale 0.12s ease-out;
    }

    button:active:not(:disabled) {
      scale: 0.97;
    }

    :focus-visible {
      outline: 2px solid ${colors.primary};
      outline-offset: 2px;
    }

    ${getLayoutStyles(colors)}

    .reflet-feedback-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .reflet-feedback-card {
      position: relative;
      background: ${colors.bg};
      border: 1px solid ${colors.border};
      border-radius: 12px;
      padding: 16px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .reflet-feedback-card:hover,
    .reflet-feedback-card:focus-within {
      border-color: ${colors.primary};
      box-shadow: 0 2px 8px ${colors.shadowSoft};
    }

    .reflet-feedback-open {
      position: absolute;
      inset: 0;
      border: none;
      background: transparent;
      border-radius: inherit;
      cursor: pointer;
    }

    .reflet-feedback-row {
      display: flex;
      gap: 12px;
    }

    .reflet-feedback-main {
      flex: 1;
      min-width: 0;
    }

    .reflet-feedback-comments {
      display: flex;
      align-items: center;
      gap: 4px;
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
      font-variant-numeric: tabular-nums;
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
      color: var(--reflet-chip-color, ${colors.textMuted});
      background: color-mix(
        in srgb,
        var(--reflet-chip-color, ${colors.textMuted}) 12%,
        transparent
      );
    }

    .reflet-feedback-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--reflet-chip-color, ${colors.textMuted});
    }

    .reflet-muted-note {
      color: ${colors.textMuted};
      font-size: 13px;
    }

    .reflet-detail-title {
      font-size: 18px;
      margin-bottom: 16px;
    }

    .reflet-detail-meta {
      margin-bottom: 16px;
    }

    .reflet-detail-body {
      margin-bottom: 24px;
      line-height: 1.6;
    }

    .reflet-detail-heading {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .reflet-detail-form {
      margin-top: 16px;
    }

    .reflet-retry-btn {
      margin-top: 12px;
    }

    .reflet-vote-btn {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 8px 12px;
      background: ${colors.bgSecondary};
      border: 1px solid ${colors.border};
      border-radius: 8px;
      color: ${colors.text};
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s, color 0.2s, scale 0.12s ease-out;
      min-width: 48px;
      min-height: 48px;
    }

    .reflet-vote-btn:hover {
      border-color: ${colors.primary};
      background: ${adjustBrightness(colors.primary, 90)};
    }

    .reflet-vote-btn.voted {
      background: ${colors.primary};
      border-color: ${colors.primary};
      color: ${colors.onPrimary};
    }

    .reflet-vote-count {
      font-size: 14px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .reflet-vote-icon {
      width: 16px;
      height: 16px;
    }

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

    .reflet-error {
      text-align: center;
      padding: 20px;
      color: ${colors.error};
      background: ${colors.errorBg};
      border-radius: 8px;
    }

    .reflet-login-prompt {
      text-align: center;
      padding: 20px;
      background: ${colors.bgSecondary};
      border-radius: 8px;
    }

    .reflet-login-btn {
      margin-top: 12px;
      min-height: 44px;
      padding: 10px 20px;
      background: ${colors.primary};
      color: ${colors.onPrimary};
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }

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
      font-variant-numeric: tabular-nums;
      color: ${colors.textMuted};
    }

    .reflet-comment-body {
      font-size: 14px;
      line-height: 1.6;
    }

    .reflet-comment-official {
      border-left: 3px solid ${colors.primary};
    }

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
      color: var(--reflet-chip-color, ${colors.textMuted});
      background: color-mix(
        in srgb,
        var(--reflet-chip-color, ${colors.textMuted}) 12%,
        transparent
      );
    }

    ${getFormStyles(colors)}

    ${getSurveyStyles(colors)}

    @media (pointer: coarse), (max-width: 640px) {
      .reflet-form-input,
      .reflet-form-textarea,
      .reflet-survey-textarea {
        font-size: 16px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 1ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 1ms !important;
      }

      .reflet-spinner,
      .reflet-btn-spinner {
        animation: none;
      }

      button:active:not(:disabled) {
        scale: 1;
      }
    }
  `;
}
