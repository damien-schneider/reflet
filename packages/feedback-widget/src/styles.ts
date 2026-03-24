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

    /* Form Actions */
    .reflet-form-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .reflet-screenshot-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      background: ${colors.bgSecondary};
      border: 1px solid ${colors.border};
      border-radius: 8px;
      font-size: 13px;
      color: ${colors.textMuted};
      cursor: pointer;
      transition: border-color 0.2s, color 0.2s;
      white-space: nowrap;
    }

    .reflet-screenshot-btn:hover {
      border-color: ${colors.primary};
      color: ${colors.text};
    }

    .reflet-screenshot-btn.reflet-screenshot-captured {
      border-color: ${colors.primary};
      color: ${colors.primary};
      background: ${adjustBrightness(colors.primary, 90)};
    }

    /* Screenshot Preview */
    .reflet-screenshot-preview {
      margin-top: 8px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid ${colors.border};
    }

    .reflet-screenshot-preview img {
      display: block;
      width: 100%;
      height: auto;
      max-height: 120px;
      object-fit: cover;
    }

    /* Survey */
    .reflet-survey {
      padding: 16px;
    }

    .reflet-survey-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .reflet-survey-title {
      font-weight: 600;
      font-size: 15px;
      color: ${colors.text};
    }

    .reflet-survey-close {
      background: none;
      border: none;
      font-size: 20px;
      color: ${colors.textMuted};
      cursor: pointer;
      padding: 4px;
      line-height: 1;
    }

    .reflet-survey-close:hover {
      color: ${colors.text};
    }

    .reflet-survey-progress {
      height: 4px;
      background: ${colors.border};
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 4px;
    }

    .reflet-survey-progress-bar {
      height: 100%;
      background: ${colors.primary};
      border-radius: 2px;
      transition: width 0.3s ease;
    }

    .reflet-survey-progress-text {
      font-size: 11px;
      color: ${colors.textMuted};
      margin-bottom: 16px;
    }

    .reflet-survey-question {
      margin-bottom: 20px;
    }

    .reflet-survey-question-title {
      font-size: 14px;
      font-weight: 500;
      color: ${colors.text};
      margin-bottom: 4px;
    }

    .reflet-survey-question-desc {
      font-size: 12px;
      color: ${colors.textMuted};
      margin-bottom: 12px;
    }

    .reflet-required {
      color: ${colors.error};
    }

    .reflet-survey-input {
      margin-top: 12px;
    }

    .reflet-rating-scale,
    .reflet-nps-scale {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .reflet-rating-btn,
    .reflet-nps-btn {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid ${colors.border};
      border-radius: 8px;
      background: ${colors.bg};
      color: ${colors.text};
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .reflet-rating-btn:hover,
    .reflet-nps-btn:hover {
      border-color: ${colors.primary};
    }

    .reflet-rating-btn.selected,
    .reflet-nps-btn.selected {
      background: ${colors.primary};
      border-color: ${colors.primary};
      color: white;
    }

    .reflet-nps-btn {
      width: 30px;
      height: 30px;
      font-size: 12px;
      border-radius: 6px;
    }

    .reflet-rating-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      font-size: 11px;
      color: ${colors.textMuted};
    }

    .reflet-survey-textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid ${colors.border};
      border-radius: 8px;
      font-size: 14px;
      background: ${colors.bg};
      color: ${colors.text};
      resize: vertical;
      min-height: 80px;
      font-family: inherit;
    }

    .reflet-survey-textarea:focus {
      outline: none;
      border-color: ${colors.primary};
    }

    .reflet-choice-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .reflet-choice-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border: 1px solid ${colors.border};
      border-radius: 8px;
      cursor: pointer;
      transition: border-color 0.15s;
      font-size: 13px;
      color: ${colors.text};
    }

    .reflet-choice-item:hover {
      border-color: ${colors.primary};
    }

    .reflet-choice-item input {
      accent-color: ${colors.primary};
    }

    .reflet-boolean-btns {
      display: flex;
      gap: 8px;
    }

    .reflet-bool-btn {
      flex: 1;
      padding: 10px;
      border: 1px solid ${colors.border};
      border-radius: 8px;
      background: ${colors.bg};
      color: ${colors.text};
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }

    .reflet-bool-btn:hover {
      border-color: ${colors.primary};
    }

    .reflet-bool-btn.selected {
      background: ${colors.primary};
      border-color: ${colors.primary};
      color: white;
    }

    .reflet-survey-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .reflet-survey-btn-primary {
      padding: 10px 20px;
      background: ${colors.primary};
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }

    .reflet-survey-btn-primary:hover {
      background: ${colors.primaryHover};
    }

    .reflet-survey-btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .reflet-survey-btn-secondary {
      padding: 10px 20px;
      background: transparent;
      color: ${colors.textMuted};
      border: 1px solid ${colors.border};
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      transition: color 0.2s;
    }

    .reflet-survey-btn-secondary:hover {
      color: ${colors.text};
    }

    .reflet-survey-complete {
      text-align: center;
      padding: 32px 16px;
    }

    .reflet-survey-complete-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: ${colors.primary};
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      margin: 0 auto 16px;
    }

    .reflet-survey-complete-title {
      font-size: 18px;
      font-weight: 600;
      color: ${colors.text};
      margin-bottom: 8px;
    }

    .reflet-survey-complete-desc {
      font-size: 14px;
      color: ${colors.textMuted};
      margin-bottom: 20px;
    }
  `;
}
