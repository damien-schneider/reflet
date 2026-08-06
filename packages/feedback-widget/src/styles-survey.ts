import { adjustBrightness, type WidgetColors } from "./color-utils";

export function getSurveyStyles(colors: WidgetColors): string {
  return `
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

    /* Survey animations */
    @keyframes reflet-slide-right {
      from { opacity: 0; transform: translateX(16px); }
      to { opacity: 1; transform: translateX(0); }
    }

    @keyframes reflet-slide-left {
      from { opacity: 0; transform: translateX(-16px); }
      to { opacity: 1; transform: translateX(0); }
    }

    @keyframes reflet-fade-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    @keyframes reflet-btn-spin {
      to { transform: rotate(360deg); }
    }

    .reflet-slide-in-right {
      animation: reflet-slide-right 0.2s ease-out;
    }

    .reflet-slide-in-left {
      animation: reflet-slide-left 0.2s ease-out;
    }

    .reflet-fade-in {
      animation: reflet-fade-in 0.3s ease-out;
    }

    .reflet-btn-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: reflet-btn-spin 0.6s linear infinite;
      margin-right: 6px;
      vertical-align: middle;
    }

    /* Survey validation */
    .reflet-survey-validation {
      font-size: 12px;
      color: ${colors.error};
      margin-top: 8px;
    }

    /* Character count */
    .reflet-char-count {
      font-size: 11px;
      color: ${colors.textMuted};
      text-align: right;
      margin-top: 4px;
    }

    /* Keyboard hint */
    .reflet-survey-kbd-hint {
      font-size: 11px;
      color: ${colors.textMuted};
      opacity: 0.6;
    }

    .reflet-survey-progress-text {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: ${colors.textMuted};
      margin-bottom: 16px;
    }

    /* Selected choice highlight */
    .reflet-choice-item.selected {
      border-color: ${colors.primary};
      background: ${adjustBrightness(colors.primary, 95)};
    }

    /* Survey overlay animation */
    .reflet-survey-overlay {
      animation: reflet-fade-in 0.2s ease-out;
    }

    /* Fieldset reset */
    fieldset.reflet-choice-list {
      border: none;
      padding: 0;
      margin: 0;
    }
  `;
}
