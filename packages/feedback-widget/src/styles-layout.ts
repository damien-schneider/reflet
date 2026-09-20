import type { WidgetColors } from "./color-utils";
import { FEEDBACK_WIDGET_Z_INDEX } from "./z-index";

export function getLayoutStyles(colors: WidgetColors): string {
  return `
    .reflet-launcher {
      position: fixed;
      z-index: ${FEEDBACK_WIDGET_Z_INDEX.launcher};
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: ${colors.primary};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px ${colors.shadow};
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s, scale 0.12s ease-out;
    }

    .reflet-launcher:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px ${colors.shadow};
    }

    .reflet-launcher.bottom-right {
      bottom: max(24px, env(safe-area-inset-bottom));
      right: 24px;
    }

    .reflet-launcher.bottom-left {
      bottom: max(24px, env(safe-area-inset-bottom));
      left: 24px;
    }

    .reflet-launcher-icon {
      color: ${colors.onPrimary};
      width: 24px;
      height: 24px;
    }

    .reflet-launcher-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: ${colors.error};
      color: ${colors.onPrimary};
      font-size: 11px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      min-width: 20px;
      height: 20px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 6px;
    }

    .reflet-window {
      position: fixed;
      z-index: ${FEEDBACK_WIDGET_Z_INDEX.window};
      width: 400px;
      max-width: calc(100vw - 48px);
      height: 600px;
      max-height: calc(100dvh - 48px);
      background: ${colors.bg};
      border-radius: 16px;
      box-shadow: 0 8px 32px ${colors.shadow};
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .reflet-window.bottom-right {
      bottom: max(96px, calc(72px + env(safe-area-inset-bottom)));
      right: 24px;
    }

    .reflet-window.bottom-left {
      bottom: max(96px, calc(72px + env(safe-area-inset-bottom)));
      left: 24px;
    }

    .reflet-window.inline {
      position: relative;
      width: 100%;
      height: auto;
      min-height: 400px;
      max-height: none;
      box-shadow: none;
      border: 1px solid ${colors.border};
    }

    .reflet-header {
      padding: 16px;
      background: ${colors.primary};
      color: ${colors.onPrimary};
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
      color: ${colors.onPrimary};
      cursor: pointer;
      width: 40px;
      height: 40px;
      margin: -8px -8px 0 0;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .reflet-close-btn:hover {
      background: ${colors.onPrimaryOverlay};
    }

    .reflet-nav {
      display: flex;
      border-bottom: 1px solid ${colors.border};
      background: ${colors.bgSecondary};
      flex-shrink: 0;
    }

    .reflet-nav-item {
      flex: 1;
      min-height: 44px;
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

    .reflet-content {
      flex: 1;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 16px;
    }

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

    .reflet-back-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      min-height: 40px;
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
  `;
}
