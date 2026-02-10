import {
  closeIcon,
  emptyIcon,
  externalLinkIcon,
  megaphoneIcon,
  sparkleIcon,
} from "./icons";
import type { ChangelogEntry } from "./types";
import { escapeHtml, formatDate } from "./widget-utils";

export function renderCardModeHTML(
  entries: ChangelogEntry[],
  unreadCount: number,
  isOpen: boolean,
  isLoading: boolean,
  position: string | undefined
): string {
  if (isOpen) {
    return renderPanelHTML(entries, "popup", isLoading, null);
  }

  if (isLoading || entries.length === 0) {
    return "";
  }

  const latest = entries[0];
  if (!latest) {
    return "";
  }

  return `
    <div class="reflet-changelog-card ${position}" data-action="open-panel">
      <div class="reflet-changelog-card-header">
        <span class="reflet-changelog-card-icon">${megaphoneIcon}</span>
        <span class="reflet-changelog-card-label">What's New</span>
        ${unreadCount > 0 ? `<span class="reflet-changelog-card-badge">${unreadCount}</span>` : ""}
        <button class="reflet-changelog-card-dismiss" data-action="dismiss" aria-label="Dismiss">${closeIcon}</button>
      </div>
      <div class="reflet-changelog-card-body">
        <div class="reflet-changelog-card-title">${escapeHtml(latest.title)}</div>
        ${latest.version ? `<div class="reflet-changelog-card-version">v${escapeHtml(latest.version)}</div>` : ""}
      </div>
    </div>
  `;
}

export function renderPopupModeHTML(
  entries: ChangelogEntry[],
  isOpen: boolean,
  isLoading: boolean,
  error: string | null
): string {
  if (!isOpen) {
    return "";
  }
  return renderPanelHTML(entries, "popup", isLoading, error);
}

export function renderTriggerModeHTML(
  entries: ChangelogEntry[],
  isOpen: boolean,
  isLoading: boolean,
  error: string | null
): string {
  if (!isOpen) {
    return "";
  }
  return renderPanelHTML(entries, "trigger", isLoading, error);
}

export function renderPanelHTML(
  entries: ChangelogEntry[],
  panelType: "popup" | "trigger",
  isLoading: boolean,
  error: string | null,
  lastSeenTimestamp = 0
): string {
  const overlayStart =
    panelType === "popup"
      ? `<div class="reflet-changelog-overlay" data-action="close">`
      : "";
  const overlayEnd = panelType === "popup" ? "</div>" : "";

  return `
    ${overlayStart}
    <div class="reflet-changelog-panel ${panelType}" ${panelType === "popup" ? 'onclick="event.stopPropagation()"' : ""}>
      <div class="reflet-changelog-panel-header">
        <div class="reflet-changelog-panel-header-left">
          <span class="reflet-changelog-panel-icon">${megaphoneIcon}</span>
          <h3 class="reflet-changelog-panel-title">What's New</h3>
        </div>
        <button class="reflet-changelog-close-btn" data-action="close" aria-label="Close">${closeIcon}</button>
      </div>

      ${error ? renderErrorHTML(error) : ""}
      ${isLoading ? renderLoadingHTML() : ""}
      ${isLoading || error ? "" : renderEntriesListHTML(entries, lastSeenTimestamp)}

      <div class="reflet-changelog-footer">
        Powered by <a href="https://reflet.app" target="_blank" rel="noopener">Reflet</a>
      </div>
    </div>
    ${overlayEnd}
  `;
}

export function renderEntriesListHTML(
  entries: ChangelogEntry[],
  lastSeenTimestamp: number
): string {
  if (entries.length === 0) {
    return `
      <div class="reflet-changelog-empty">
        <div class="reflet-changelog-empty-icon">${emptyIcon}</div>
        <p>No updates yet</p>
        <p style="margin-top: 4px; font-size: 13px;">Check back later for product updates.</p>
      </div>
    `;
  }

  let html = '<div class="reflet-changelog-list">';
  for (const entry of entries) {
    const isNew = !!(
      entry.publishedAt && entry.publishedAt > lastSeenTimestamp
    );
    html += `
      <div class="reflet-changelog-entry" data-entry-id="${entry.id}">
        <div class="reflet-changelog-entry-header">
          ${entry.version ? `<span class="reflet-changelog-entry-version">v${escapeHtml(entry.version)}</span>` : ""}
          ${entry.publishedAt ? `<span class="reflet-changelog-entry-date">${formatDate(entry.publishedAt)}</span>` : ""}
          ${isNew ? `<span class="reflet-changelog-entry-new">${sparkleIcon} New</span>` : ""}
        </div>
        <div class="reflet-changelog-entry-title">${escapeHtml(entry.title)}</div>
        ${entry.description ? `<div class="reflet-changelog-entry-description">${escapeHtml(entry.description)}</div>` : ""}
        ${
          entry.feedback.length > 0
            ? `
          <div class="reflet-changelog-entry-feedback">
            ${entry.feedback
              .map(
                (fb) =>
                  `<span class="reflet-changelog-entry-feedback-item">${externalLinkIcon} ${escapeHtml(fb.title)}</span>`
              )
              .join("")}
          </div>
        `
            : ""
        }
      </div>
    `;
  }
  html += "</div>";
  return html;
}

function renderLoadingHTML(): string {
  return `
    <div class="reflet-changelog-loading">
      <div class="reflet-changelog-spinner"></div>
    </div>
  `;
}

function renderErrorHTML(error: string): string {
  return `
    <div class="reflet-changelog-error">
      <p>${escapeHtml(error)}</p>
      <button class="reflet-changelog-retry-btn" data-action="retry">Retry</button>
    </div>
  `;
}
