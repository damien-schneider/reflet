import { ChangelogApi } from "./api";
import { getChangelogStyles } from "./styles";
import type {
  ChangelogEntry,
  ChangelogWidgetConfig,
  ChangelogWidgetState,
} from "./types";
import {
  renderCardModeHTML,
  renderPanelHTML,
  renderPopupModeHTML,
  renderTriggerModeHTML,
} from "./widget-html";

const STORAGE_KEY_PREFIX = "reflet_changelog_seen_";

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
      if (badge instanceof HTMLElement) {
        badge.textContent = unreadCount > 0 ? String(unreadCount) : "";
        badge.style.display = unreadCount > 0 ? "inline-flex" : "none";
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
    const { isOpen, isLoading, entries, unreadCount, error } = this.state;

    switch (mode) {
      case "card":
        if (isOpen) {
          return renderPanelHTML(
            entries,
            "popup",
            isLoading,
            error,
            this.getLastSeenTimestamp()
          );
        }
        return renderCardModeHTML(
          entries,
          unreadCount,
          isOpen,
          isLoading,
          this.config.position
        );
      case "popup":
        return renderPopupModeHTML(entries, isOpen, isLoading, error);
      case "trigger":
        return renderTriggerModeHTML(entries, isOpen, isLoading, error);
      default:
        return renderCardModeHTML(
          entries,
          unreadCount,
          isOpen,
          isLoading,
          this.config.position
        );
    }
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
        if (
          e.target instanceof HTMLElement &&
          e.target.closest("[data-action='dismiss']")
        ) {
          return;
        }
        this.open();
      });
    }

    // All action buttons
    const actionButtons = Array.from(
      this.shadowRoot.querySelectorAll("[data-action]")
    );
    for (const btn of actionButtons) {
      const action = btn.getAttribute("data-action");
      if (action === "close") {
        btn.addEventListener("click", (e: Event) => {
          e.stopPropagation();
          this.close();
        });
      } else if (action === "dismiss") {
        btn.addEventListener("click", (e: Event) => {
          e.stopPropagation();
          this.dismiss();
        });
      } else if (action === "retry") {
        btn.addEventListener("click", (e: Event) => {
          e.stopPropagation();
          this.retry();
        });
      }
    }

    // Entry clicks
    const entryElements = Array.from(
      this.shadowRoot.querySelectorAll(".reflet-changelog-entry")
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
