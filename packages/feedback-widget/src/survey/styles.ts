import type { WidgetColors } from "../color-utils";
import { FEEDBACK_WIDGET_Z_INDEX } from "../z-index";
import { getSurveyInputStyles } from "./styles-inputs";

export function getSurveyStyles(colors: WidgetColors): string {
  return `
    .reflet-survey-overlay {
      position: fixed;
      z-index: ${FEEDBACK_WIDGET_Z_INDEX.survey};
      animation: reflet-fade-in 0.2s ease-out;
    }

    .reflet-survey-bottom_right {
      right: 24px;
      bottom: max(24px, env(safe-area-inset-bottom));
    }

    .reflet-survey-bottom_left {
      left: 24px;
      bottom: max(24px, env(safe-area-inset-bottom));
    }

    .reflet-survey-center {
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .reflet-survey-backdrop {
      position: absolute;
      inset: 0;
      background: rgb(0 0 0 / 40%);
    }

    .reflet-survey-stage {
      position: relative;
    }

    .reflet-survey {
      width: 360px;
      max-width: calc(100vw - 32px);
      max-height: calc(100dvh - 48px);
      overflow-y: auto;
      padding: 16px;
      background: ${colors.bg};
      border: 1px solid ${colors.hairline};
      border-radius: 16px;
      box-shadow: 0 8px 32px ${colors.shadow};
    }

    .reflet-survey [hidden] {
      display: none;
    }

    .reflet-survey-center .reflet-survey {
      width: 440px;
    }

    @media (max-width: 480px) {
      .reflet-survey-bottom_right,
      .reflet-survey-bottom_left {
        left: 12px;
        right: 12px;
        bottom: max(12px, env(safe-area-inset-bottom));
      }

      .reflet-survey-bottom_right .reflet-survey,
      .reflet-survey-bottom_left .reflet-survey {
        width: auto;
        max-width: none;
      }
    }

    .reflet-survey-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 12px;
    }

    .reflet-survey-title {
      font-weight: 600;
      font-size: 13px;
      color: ${colors.textMuted};
    }

    .reflet-survey-close {
      min-width: 32px;
      min-height: 32px;
      background: none;
      border: none;
      border-radius: 6px;
      font-size: 20px;
      color: ${colors.textMuted};
      cursor: pointer;
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
      margin-bottom: 16px;
    }

    .reflet-survey-progress-bar {
      width: 100%;
      height: 100%;
      background: ${colors.primary};
      border-radius: 2px;
      transform-origin: left center;
      scale: var(--reflet-survey-progress, 0) 1;
      transition: scale 0.3s ease-out;
    }

    .reflet-survey-question {
      margin-bottom: 16px;
    }

    .reflet-survey-question-title {
      font-size: 15px;
      font-weight: 600;
      color: ${colors.text};
      margin-bottom: 4px;
      text-wrap: balance;
    }

    .reflet-survey-question-title:focus {
      outline: none;
    }

    .reflet-survey-question-desc {
      font-size: 13px;
      color: ${colors.textMuted};
      text-wrap: pretty;
    }

    .reflet-required {
      color: ${colors.error};
    }

    .reflet-survey-input {
      margin-top: 12px;
    }

    .reflet-survey-input:empty {
      display: none;
    }

    .reflet-survey-validation {
      font-size: 12px;
      color: ${colors.error};
      margin: -8px 0 12px;
    }

    .reflet-survey-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .reflet-survey-actions [data-primary] {
      margin-left: auto;
    }

    .reflet-survey-btn-primary,
    .reflet-survey-btn-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
    }

    .reflet-survey-btn-primary {
      background: ${colors.primary};
      color: ${colors.onPrimary};
      border: none;
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
      background: transparent;
      color: ${colors.textMuted};
      border: 1px solid ${colors.border};
      transition: color 0.2s;
    }

    .reflet-survey-btn-secondary:hover {
      color: ${colors.text};
    }

    .reflet-survey-complete {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 16px 8px 8px;
    }

    .reflet-survey-complete-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: ${colors.primary};
      color: ${colors.onPrimary};
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }

    .reflet-survey-complete-title {
      font-size: 18px;
      font-weight: 600;
      color: ${colors.text};
      margin-bottom: 8px;
      text-wrap: balance;
    }

    .reflet-survey-complete-title:focus {
      outline: none;
    }

    .reflet-survey-complete-desc {
      font-size: 14px;
      color: ${colors.textMuted};
      margin-bottom: 20px;
      text-wrap: pretty;
    }

    .reflet-sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    @keyframes reflet-slide-right {
      from { opacity: 0; transform: translateX(16px); }
      to { opacity: 1; transform: translateX(0); }
    }

    @keyframes reflet-fade-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .reflet-slide-in-right {
      animation: reflet-slide-right 0.2s ease-out;
    }

    .reflet-fade-in {
      animation: reflet-fade-in 0.3s ease-out;
    }

    ${getSurveyInputStyles(colors)}
  `;
}
