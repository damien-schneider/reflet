import { createChangelogColors } from "./color-utils";
import { getCardStyles } from "./styles-card";
import { CHANGELOG_WIDGET_Z_INDEX } from "./z-index";

export function getChangelogStyles(
  primaryColor: string,
  theme: "light" | "dark"
): string {
  const colors = createChangelogColors(primaryColor, theme === "dark");

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

    .reflet-changelog-container {
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

    ${getCardStyles(colors)}

    .reflet-changelog-overlay {
      position: fixed;
      inset: 0;
      z-index: ${CHANGELOG_WIDGET_Z_INDEX.trigger};
      background: ${colors.scrim};
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .reflet-changelog-panel {
      position: relative;
      z-index: ${CHANGELOG_WIDGET_Z_INDEX.panel};
      width: 420px;
      max-width: calc(100vw - 32px);
      max-height: min(520px, calc(100dvh - 32px));
      background: ${colors.bg};
      border-radius: 16px;
      box-shadow: 0 8px 32px ${colors.shadow};
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid ${colors.border};
    }

    .reflet-changelog-panel.trigger {
      position: absolute;
    }

    .reflet-changelog-panel-header {
      padding: 16px 20px;
      background: ${colors.primary};
      color: ${colors.onPrimary};
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
      color: ${colors.onPrimary};
      cursor: pointer;
      width: 40px;
      height: 40px;
      margin: -8px -8px -8px 0;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .reflet-changelog-close-btn:hover {
      background: ${colors.onPrimaryOverlay};
    }

    .reflet-changelog-list {
      flex: 1;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 8px 0;
    }

    .reflet-changelog-entry {
      display: block;
      width: 100%;
      text-align: left;
      background: transparent;
      border: none;
      border-bottom: 1px solid ${colors.border};
      padding: 16px 20px;
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
      font-variant-numeric: tabular-nums;
      color: ${colors.primary};
      background: ${colors.primaryLight};
      padding: 2px 8px;
      border-radius: 4px;
    }

    .reflet-changelog-entry-date {
      font-size: 12px;
      font-variant-numeric: tabular-nums;
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
      display: block;
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

    .reflet-changelog-empty-note {
      margin-top: 4px;
      font-size: 13px;
    }

    .reflet-changelog-error {
      text-align: center;
      padding: 20px;
      color: ${colors.error};
      background: ${colors.errorBg};
      border-radius: 8px;
      margin: 16px 20px;
    }

    .reflet-changelog-retry-btn {
      margin-top: 12px;
      min-height: 40px;
      padding: 8px 16px;
      background: ${colors.primary};
      color: ${colors.onPrimary};
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }

    .reflet-changelog-retry-btn:hover {
      background: ${colors.primaryHover};
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 1ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 1ms !important;
      }

      .reflet-changelog-spinner {
        animation: none;
      }

      button:active:not(:disabled) {
        scale: 1;
      }

      .reflet-changelog-card:hover,
      .reflet-changelog-card:focus-within {
        transform: none;
      }
    }
  `;
}
