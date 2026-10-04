import { adjustBrightness, type WidgetColors } from "../color-utils";

export function getSurveyInputStyles(colors: WidgetColors): string {
  return `
    .reflet-rating-scale,
    .reflet-nps-scale,
    .reflet-star-scale {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .reflet-rating-btn,
    .reflet-nps-btn {
      min-width: 36px;
      height: 36px;
      padding: 0 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid ${colors.border};
      border-radius: 8px;
      background: ${colors.bg};
      color: ${colors.text};
      font-size: 13px;
      font-variant-numeric: tabular-nums;
      cursor: pointer;
      transition: border-color 0.15s, background-color 0.15s, color 0.15s;
    }

    .reflet-nps-scale {
      display: grid;
      grid-template-columns: repeat(11, minmax(0, 1fr));
      gap: 4px;
    }

    .reflet-nps-btn {
      min-width: 0;
      height: 32px;
      padding: 0;
      font-size: 12px;
      border-radius: 6px;
    }

    .reflet-emoji-btn {
      font-size: 20px;
      min-width: 44px;
      height: 44px;
    }

    .reflet-rating-btn:hover,
    .reflet-nps-btn:hover,
    .reflet-bool-btn:hover,
    .reflet-choice-item:hover {
      border-color: ${colors.primary};
    }

    .reflet-rating-btn.selected,
    .reflet-nps-btn.selected,
    .reflet-bool-btn.selected {
      background: ${colors.primary};
      border-color: ${colors.primary};
      color: ${colors.onPrimary};
    }

    .reflet-emoji-btn.selected {
      background: ${adjustBrightness(colors.primary, 90)};
    }

    .reflet-star-btn {
      width: 36px;
      height: 36px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: none;
      color: ${colors.border};
      cursor: pointer;
      transition: color 0.15s;
    }

    .reflet-star-btn.filled,
    .reflet-star-scale:hover .reflet-star-btn {
      color: #f59e0b;
    }

    .reflet-star-scale .reflet-star-btn:hover ~ .reflet-star-btn {
      color: ${colors.border};
    }

    .reflet-rating-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      font-size: 11px;
      color: ${colors.textMuted};
    }

    .reflet-survey-textarea,
    .reflet-survey-other-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid ${colors.border};
      border-radius: 8px;
      font-size: 14px;
      background: ${colors.bg};
      color: ${colors.text};
      font-family: inherit;
    }

    .reflet-survey-textarea {
      resize: vertical;
      min-height: 80px;
    }

    .reflet-survey-other-input {
      margin-top: 8px;
    }

    .reflet-survey-textarea:focus,
    .reflet-survey-other-input:focus {
      outline: none;
      border-color: ${colors.primary};
    }

    .reflet-char-count {
      font-size: 11px;
      font-variant-numeric: tabular-nums;
      color: ${colors.textMuted};
      text-align: right;
      margin-top: 4px;
    }

    .reflet-choice-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .reflet-choice-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 10px 12px;
      border: 1px solid ${colors.border};
      border-radius: 8px;
      background: ${colors.bg};
      color: ${colors.text};
      font: inherit;
      font-size: 13px;
      text-align: left;
      cursor: pointer;
      transition: border-color 0.15s, background-color 0.15s;
    }

    .reflet-choice-item.selected {
      border-color: ${colors.primary};
      background: ${adjustBrightness(colors.primary, 95)};
    }

    .reflet-choice-mark {
      flex: none;
      width: 16px;
      height: 16px;
      border: 1.5px solid ${colors.border};
      border-radius: 50%;
    }

    .reflet-choice-item[role="checkbox"] .reflet-choice-mark {
      border-radius: 4px;
    }

    .reflet-choice-item.selected .reflet-choice-mark {
      border-color: ${colors.primary};
      background: ${colors.primary};
      box-shadow: inset 0 0 0 3px ${colors.bg};
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
      transition: border-color 0.15s, background-color 0.15s, color 0.15s;
    }

    .reflet-survey-overlay :focus-visible {
      outline: 2px solid ${colors.primary};
      outline-offset: 2px;
    }
  `;
}
