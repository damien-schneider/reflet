import { ChangelogApi } from "./api";
import {
  closeIcon,
  emptyIcon,
  externalLinkIcon,
  megaphoneIcon,
  sparkleIcon,
} from "./icons";
import { getChangelogStyles } from "./styles";
import type {
  ChangelogEntry,
  ChangelogWidgetConfig,
  ChangelogWidgetState,
} from "./types";

const STORAGE_KEY_PREFIX = "reflet_changelog_seen_";

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export class RefletChangelogWidget {
  private readonly config: ChangelogWidgetConfig;
  private readonly api: ChangelogApi;
  private container: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private triggerElements: Element[] = [];
  private readonly boundTriggerHandler: (e: Event) => void;
  private readonly state: ChangelogWidgetState = {
    isOpen: false,
    isLoading: true,
    entries: [],
    unreadCount: 0,
    error: null,
  };

  constructor(config: ChangelogWidgetConfig) {
    this.config = {
      mode: "card",
      position: "bottom-right",
      theme: "light",
      primaryColor: "#6366f1",
      maxEntries: 10,
      triggerSelector: "[data-reflet-changelog]",
      autoOpenForNew: false,
      ...config,
    };

    this.api = new ChangelogApi(config.publicKey);
    this.boundTriggerHandler = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggle();
    };
  }

  async init(): Promise<void> {
    this.createContainer();
    this.injectStyles();

    if (this.config.mode === "trigger") {
      this.bindTriggers();
    }

    this.render();

    try {
      const entries = await this.api.getChangelog(this.config.maxEntries);
      this.state.entries = entries;
      this.state.isLoading = false;
      this.state.unreadCount = this.computeUnreadCount(entries);

      if (
        this.config.autoOpenForNew &&
        this.state.unreadCount > 0 &&
        this.config.mode !== "trigger"
      ) {
        this.state.isOpen = true;
      }

      this.render();
      this.updateTriggerBadges();
    } catch (error) {
      this.state.error =
        error instanceof Error ? error.message : "Failed to load changelog";
      this.state.isLoading = false;
      this.render();
    }
  }

  private createContainer(): void {
    this.container = document.createElement("div");
    this.container.id = "reflet-changelog-widget-root";
    this.shadowRoot = this.container.attachShadow({ mode: "closed" });
    document.body.appendChild(this.container);
  }

  private injectStyles(): void {
    if (!this.shadowRoot) {
      return;
    }

    const { primaryColor, theme } = this.config;
    let resolvedTheme: "light" | "dark" = theme === "dark" ? "dark" : "light";
    if (theme === "auto") {
      resolvedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    const style = document.createElement("style");
    style.textContent = getChangelogStyles(
      primaryColor ?? "#6366f1",
      9999,
      resolvedTheme
    );
    this.shadowRoot.appendChild(style);
  }

  private bindTriggers(): void {
    const selector = this.config.triggerSelector ?? "[data-reflet-changelog]";
    const elements = document.querySelectorAll(selector);
    this.triggerElements = Array.from(elements);

    for (const el of this.triggerElements) {
      el.addEventListener("click", this.boundTriggerHandler);
    }
  }

  private unbindTriggers(): void {
    for (const el of this.triggerElements) {
      el.removeEventListener("click", this.boundTriggerHandler);
    }
    this.triggerElements = [];
  }

  private updateTriggerBadges(): void {
    const { unreadCount } = this.state;
    for (const el of this.triggerElements) {
      const badge = el.querySelector("[data-reflet-changelog-badge]");
      if (badge) {
        badge.textContent = unreadCount > 0 ? String(unreadCount) : "";
        (badge as HTMLElement).style.display =
          unreadCount > 0 ? "inline-flex" : "none";
      }
    }
  }

  private getStorageKey(): string {
    return `${STORAGE_KEY_PREFIX}${this.config.publicKey}`;
  }

  private getLastSeenTimestamp(): number {
    try {
      const stored = localStorage.getItem(this.getStorageKey());
      return stored ? Number(stored) : 0;
    } catch {
      return 0;
    }
  }

  private setLastSeenTimestamp(timestamp: number): void {
    try {
      localStorage.setItem(this.getStorageKey(), String(timestamp));
    } catch {
      // localStorage unavailable - ignore
    }
  }

  private computeUnreadCount(entries: ChangelogEntry[]): number {
    const lastSeen = this.getLastSeenTimestamp();
    let count = 0;
    for (const entry of entries) {
      if (entry.publishedAt && entry.publishedAt > lastSeen) {
        count++;
      }
    }
    return count;
  }

  private markAllAsRead(): void {
    if (this.state.entries.length === 0) {
      return;
    }

    let latestTimestamp = 0;
    for (const entry of this.state.entries) {
      if (entry.publishedAt && entry.publishedAt > latestTimestamp) {
        latestTimestamp = entry.publishedAt;
      }
    }

    if (latestTimestamp > 0) {
      this.setLastSeenTimestamp(latestTimestamp);
      this.state.unreadCount = 0;
      this.updateTriggerBadges();
    }
  }

  private render(): void {
    if (!this.shadowRoot) {
      return;
    }

    const existingContainer = this.shadowRoot.querySelector(
      ".reflet-changelog-container"
    );
    if (existingContainer) {
      existingContainer.remove();
    }

    const wrapper = document.createElement("div");
    wrapper.className = "reflet-changelog-container";
    wrapper.innerHTML = this.getHTML();
    this.shadowRoot.appendChild(wrapper);
    this.attachEventListeners();
  }

  private getHTML(): string {
    const { mode } = this.config;

    switch (mode) {
      case "card":
        return this.getCardModeHTML();
      case "popup":
        return this.getPopupModeHTML();
      case "trigger":
        return this.getTriggerModeHTML();
      default:
        return this.getCardModeHTML();
    }
  }

  private getCardModeHTML(): string {
    const { isOpen, isLoading, entries, unreadCount } = this.state;
    const { position } = this.config;

    // If panel is open, show full list
    if (isOpen) {
      return this.getPanelHTML("popup");
    }

    // Show nothing if loading or no entries
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

  private getPopupModeHTML(): string {
    const { isOpen } = this.state;
    if (!isOpen) {
      return "";
    }
    return this.getPanelHTML("popup");
  }

  private getTriggerModeHTML(): string {
    const { isOpen } = this.state;
    if (!isOpen) {
      return "";
    }
    return this.getPanelHTML("trigger");
  }

  private getPanelHTML(panelType: "popup" | "trigger"): string {
    const { isLoading, entries, error } = this.state;

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

        ${error ? this.getErrorHTML() : ""}
        ${isLoading ? this.getLoadingHTML() : ""}
        ${isLoading || error ? "" : this.getEntriesListHTML(entries)}

        <div class="reflet-changelog-footer">
          Powered by <a href="https://reflet.app" target="_blank" rel="noopener">Reflet</a>
        </div>
      </div>
      ${overlayEnd}
    `;
  }

  private getEntriesListHTML(entries: ChangelogEntry[]): string {
    if (entries.length === 0) {
      return `
        <div class="reflet-changelog-empty">
          <div class="reflet-changelog-empty-icon">${emptyIcon}</div>
          <p>No updates yet</p>
          <p style="margin-top: 4px; font-size: 13px;">Check back later for product updates.</p>
        </div>
      `;
    }

    const lastSeen = this.getLastSeenTimestamp();

    let html = '<div class="reflet-changelog-list">';
    for (const entry of entries) {
      const isNew = !!(entry.publishedAt && entry.publishedAt > lastSeen);
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

  private getLoadingHTML(): string {
    return `
      <div class="reflet-changelog-loading">
        <div class="reflet-changelog-spinner"></div>
      </div>
    `;
  }

  private getErrorHTML(): string {
    return `
      <div class="reflet-changelog-error">
        <p>${escapeHtml(this.state.error ?? "An error occurred")}</p>
        <button class="reflet-changelog-retry-btn" data-action="retry">Retry</button>
      </div>
    `;
  }

  private attachEventListeners(): void {
    if (!this.shadowRoot) {
      return;
    }

    // Panel close via overlay click
    const overlay = this.shadowRoot.querySelector(".reflet-changelog-overlay");
    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          this.close();
        }
      });
    }

    // Stop propagation on panel itself
    const panel = this.shadowRoot.querySelector(".reflet-changelog-panel");
    if (panel) {
      panel.addEventListener("click", (e) => e.stopPropagation());
    }

    // Card click to open panel
    const card = this.shadowRoot.querySelector("[data-action='open-panel']");
    if (card) {
      card.addEventListener("click", (e) => {
        // Don't open if dismiss was clicked
        if ((e.target as HTMLElement).closest("[data-action='dismiss']")) {
          return;
        }
        this.open();
      });
    }

    // All action buttons
    const actionButtons = this.shadowRoot.querySelectorAll("[data-action]");
    for (const btn of actionButtons) {
      const action = btn.getAttribute("data-action");
      if (action === "close") {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.close();
        });
      } else if (action === "dismiss") {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.dismiss();
        });
      } else if (action === "retry") {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.retry();
        });
      }
    }

    // Entry clicks
    const entryElements = this.shadowRoot.querySelectorAll(
      ".reflet-changelog-entry"
    );
    for (const el of entryElements) {
      el.addEventListener("click", () => {
        const entryId = el.getAttribute("data-entry-id");
        if (entryId && this.config.onEntryClick) {
          const entry = this.state.entries.find((e) => e.id === entryId);
          if (entry) {
            this.config.onEntryClick(entry);
          }
        }
      });
    }
  }

  private async retry(): Promise<void> {
    this.state.error = null;
    this.state.isLoading = true;
    this.render();

    try {
      const entries = await this.api.getChangelog(this.config.maxEntries);
      this.state.entries = entries;
      this.state.isLoading = false;
      this.state.unreadCount = this.computeUnreadCount(entries);
      this.render();
      this.updateTriggerBadges();
    } catch (error) {
      this.state.error =
        error instanceof Error ? error.message : "Failed to load changelog";
      this.state.isLoading = false;
      this.render();
    }
  }

  private dismiss(): void {
    this.markAllAsRead();

    // In card mode, just hide the card
    if (this.config.mode === "card" && this.container) {
      this.container.style.display = "none";
    }
  }

  // ==================== Public API ====================

  open(): void {
    this.state.isOpen = true;
    this.markAllAsRead();
    this.config.onOpen?.();
    this.render();
  }

  close(): void {
    this.state.isOpen = false;
    this.config.onClose?.();
    this.render();
  }

  toggle(): void {
    if (this.state.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  getUnreadCount(): number {
    return this.state.unreadCount;
  }

  markAsRead(): void {
    this.markAllAsRead();
    this.render();
  }

  destroy(): void {
    this.unbindTriggers();
    if (this.container) {
      this.container.remove();
      this.container = null;
      this.shadowRoot = null;
    }
  }
}
