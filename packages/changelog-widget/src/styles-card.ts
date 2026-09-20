import type { ChangelogColors } from "./color-utils";
import { CHANGELOG_WIDGET_Z_INDEX } from "./z-index";

export function getCardStyles(colors: ChangelogColors): string {
  return `
    .reflet-changelog-card {
      position: fixed;
      z-index: ${CHANGELOG_WIDGET_Z_INDEX.trigger};
      max-width: 320px;
      background: ${colors.bg};
      border-radius: 12px;
      box-shadow: 0 4px 16px ${colors.shadowSoft};
      border: 1px solid ${colors.border};
      transition: transform 0.2s, box-shadow 0.2s;
      overflow: hidden;
    }

    .reflet-changelog-card:hover,
    .reflet-changelog-card:focus-within {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px ${colors.shadow};
    }

    .reflet-changelog-card.bottom-right {
      bottom: max(24px, env(safe-area-inset-bottom));
      right: 24px;
    }

    .reflet-changelog-card.bottom-left {
      bottom: max(24px, env(safe-area-inset-bottom));
      left: 24px;
    }

    .reflet-changelog-card-open {
      position: absolute;
      inset: 0;
      border: none;
      background: transparent;
      cursor: pointer;
    }

    .reflet-changelog-card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: ${colors.primary};
      color: ${colors.onPrimary};
    }

    .reflet-changelog-card-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .reflet-changelog-card-label {
      font-size: 13px;
      font-weight: 600;
      flex: 1;
    }

    .reflet-changelog-card-badge {
      background: ${colors.newBadge};
      color: ${colors.onPrimary};
      font-size: 11px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      padding: 1px 7px;
      border-radius: 10px;
      margin-right: 24px;
    }

    .reflet-changelog-card-body {
      padding: 12px 16px;
    }

    .reflet-changelog-card-title {
      font-size: 14px;
      font-weight: 600;
      color: ${colors.text};
      margin-bottom: 4px;
    }

    .reflet-changelog-card-version {
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      color: ${colors.textMuted};
    }

    .reflet-changelog-card-dismiss {
      position: absolute;
      top: 2px;
      right: 2px;
      background: transparent;
      border: none;
      color: ${colors.onPrimaryMuted};
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
    }

    .reflet-changelog-card-dismiss:hover {
      color: ${colors.onPrimary};
      background: ${colors.onPrimaryOverlay};
    }

    .reflet-changelog-card-dismiss svg {
      width: 14px;
      height: 14px;
    }
  `;
}
