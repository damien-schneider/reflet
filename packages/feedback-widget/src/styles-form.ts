import { adjustBrightness, type WidgetColors } from "./color-utils";

export function getFormStyles(colors: WidgetColors): string {
  return `
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
      font-family: inherit;
      font-size: 14px;
      background: ${colors.bg};
      color: ${colors.text};
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .reflet-form-input:focus,
    .reflet-form-textarea:focus {
      outline: none;
      border-color: ${colors.primary};
      box-shadow: 0 0 0 3px color-mix(in srgb, ${colors.primary} 20%, transparent);
    }

    .reflet-form-textarea {
      resize: vertical;
      min-height: 120px;
    }

    .reflet-submit-btn {
      min-height: 44px;
      padding: 12px 24px;
      background: ${colors.primary};
      color: ${colors.onPrimary};
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s, scale 0.12s ease-out;
    }

    .reflet-submit-btn:hover {
      background: ${colors.primaryHover};
    }

    .reflet-submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .reflet-submit-btn-block {
      width: 100%;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .reflet-form-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .reflet-screenshot-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      min-height: 44px;
      padding: 10px 16px;
      background: ${colors.bgSecondary};
      border: 1px solid ${colors.border};
      border-radius: 8px;
      font-size: 13px;
      color: ${colors.textMuted};
      cursor: pointer;
      transition: border-color 0.2s, color 0.2s, scale 0.12s ease-out;
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
      outline: 1px solid ${colors.hairline};
      outline-offset: -1px;
    }
  `;
}
