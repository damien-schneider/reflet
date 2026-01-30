import { createApi, type FeedbackApi } from "./api";
import {
  backIcon,
  closeIcon,
  commentIcon,
  emptyIcon,
  feedbackIcon,
  plusIcon,
  upvoteIcon,
} from "./icons";
import { getWidgetStyles } from "./styles";
import type { FeedbackItem, WidgetConfig, WidgetState } from "./types";

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

  return date.toLocaleDateString();
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export class RefletFeedbackWidget {
  private readonly config: WidgetConfig;
  private readonly api: FeedbackApi;
  private container: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private readonly state: WidgetState = {
    isOpen: false,
    isLoading: true,
    view: "list",
    boardConfig: null,
    feedbackItems: [],
    selectedFeedback: null,
    selectedFeedbackComments: [],
    error: null,
  };

  constructor(config: WidgetConfig) {
    this.config = {
      mode: "floating",
      position: "bottom-right",
      theme: "light",
      primaryColor: "#6366f1",
      features: {
        voting: true,
        comments: true,
        roadmap: false,
        changelog: false,
        createFeedback: true,
      },
      ...config,
    };

    this.api = createApi(config.publicKey);

    // Set user token if provided
    if (config.userToken) {
      this.api.setUserToken(config.userToken);
    } else if (config.user) {
      // Generate simple token for client-side use
      const token = this.generateSimpleToken(config.user);
      this.api.setUserToken(token);
    }
  }

  private generateSimpleToken(user: NonNullable<WidgetConfig["user"]>): string {
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86_400,
    };
    const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
    const payloadB64 = btoa(JSON.stringify(payload));
    return `${header}.${payloadB64}.`;
  }

  async init(): Promise<void> {
    try {
      // Fetch board config
      this.state.boardConfig = await this.api.getConfig();
      this.state.isLoading = false;

      // Create widget UI
      this.createContainer();
      this.injectStyles();
      this.render();

      // Load initial data
      await this.loadFeedback();
    } catch (error) {
      this.state.error =
        error instanceof Error ? error.message : "Failed to initialize widget";
      this.state.isLoading = false;
      this.render();
    }
  }

  private createContainer(): void {
    const { mode, targetId } = this.config;

    if (mode === "inline" && targetId) {
      const target = document.getElementById(targetId);
      if (target) {
        this.container = target as HTMLDivElement;
        this.shadowRoot = this.container.attachShadow({ mode: "closed" });
        this.state.isOpen = true; // Inline mode is always "open"
        return;
      }
    }

    // Create floating container
    this.container = document.createElement("div");
    this.container.id = "reflet-feedback-widget-root";
    this.shadowRoot = this.container.attachShadow({ mode: "closed" });
    document.body.appendChild(this.container);
  }

  private injectStyles(): void {
    if (!this.shadowRoot) {
      return;
    }

    const { primaryColor, theme } = this.config;
    let resolvedTheme: "light" | "dark" = theme ?? "light";
    if (theme === "auto") {
      resolvedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    const style = document.createElement("style");
    style.textContent = getWidgetStyles(
      primaryColor ?? "#6366f1",
      9999,
      resolvedTheme
    );
    this.shadowRoot.appendChild(style);
  }

  private render(): void {
    if (!this.shadowRoot) {
      return;
    }

    const existingContainer = this.shadowRoot.querySelector(
      ".reflet-feedback-container"
    );
    if (existingContainer) {
      existingContainer.remove();
    }

    const wrapper = document.createElement("div");
    wrapper.className = "reflet-feedback-container";
    wrapper.innerHTML = this.getHTML();
    this.shadowRoot.appendChild(wrapper);
    this.attachEventListeners();
  }

  private getHTML(): string {
    const { mode, position } = this.config;
    const { isOpen, isLoading, boardConfig, error } = this.state;

    let html = "";

    // Floating launcher (only for floating mode)
    if (mode === "floating" && !isOpen) {
      html += `
        <button class="reflet-launcher ${position}" aria-label="Open feedback">
          <span class="reflet-launcher-icon">${feedbackIcon}</span>
        </button>
      `;
    }

    // Main window
    if (isOpen || mode === "inline") {
      const windowClass =
        mode === "inline"
          ? "reflet-window inline"
          : `reflet-window ${position}`;

      html += `
        <div class="${windowClass}">
          <div class="reflet-header">
            <div class="reflet-header-content">
              <h3 class="reflet-header-title">${boardConfig?.name ?? "Feedback"}</h3>
              ${boardConfig?.description ? `<p class="reflet-header-subtitle">${escapeHtml(boardConfig.description)}</p>` : ""}
            </div>
            ${mode === "floating" ? `<button class="reflet-close-btn" aria-label="Close">${closeIcon}</button>` : ""}
          </div>

          ${this.getNavHTML()}

          <div class="reflet-content">
            ${isLoading ? this.getLoadingHTML() : ""}
            ${error ? this.getErrorHTML() : ""}
            ${isLoading || error ? "" : this.getViewHTML()}
          </div>

          <div class="reflet-footer">
            Powered by <a href="https://reflet.app" target="_blank" rel="noopener">Reflet</a>
          </div>
        </div>
      `;
    }

    return html;
  }

  private getNavHTML(): string {
    const { features } = this.config;
    const { view } = this.state;

    const items = [
      { id: "list", label: "Feedback" },
      ...(features?.roadmap ? [{ id: "roadmap", label: "Roadmap" }] : []),
      ...(features?.changelog ? [{ id: "changelog", label: "Changelog" }] : []),
    ];

    if (items.length <= 1) {
      return "";
    }

    return `
      <nav class="reflet-nav">
        ${items
          .map(
            (item) => `
          <button class="reflet-nav-item ${view === item.id ? "active" : ""}" data-view="${item.id}">
            ${item.label}
          </button>
        `
          )
          .join("")}
      </nav>
    `;
  }

  private getViewHTML(): string {
    const { view } = this.state;

    switch (view) {
      case "list":
        return this.getFeedbackListHTML();
      case "detail":
        return this.getFeedbackDetailHTML();
      case "create":
        return this.getCreateFormHTML();
      default:
        return this.getFeedbackListHTML();
    }
  }

  private getFeedbackListHTML(): string {
    const { features } = this.config;
    const { feedbackItems } = this.state;

    let html = "";

    // Create button
    if (features?.createFeedback) {
      html += `
        <button class="reflet-submit-btn" style="width: 100%; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; gap: 8px;" data-action="create">
          ${plusIcon}
          Submit Feedback
        </button>
      `;
    }

    if (feedbackItems.length === 0) {
      html += `
        <div class="reflet-empty">
          <div class="reflet-empty-icon">${emptyIcon}</div>
          <p>No feedback yet</p>
          <p>Be the first to share your thoughts!</p>
        </div>
      `;
      return html;
    }

    html += '<div class="reflet-feedback-list">';
    for (const item of feedbackItems) {
      html += this.getFeedbackCardHTML(item);
    }
    html += "</div>";

    return html;
  }

  private getFeedbackCardHTML(item: FeedbackItem): string {
    const { features } = this.config;
    const statusColor = item.boardStatus?.color ?? "#6b7280";

    return `
      <div class="reflet-feedback-card" data-feedback-id="${item.id}">
        <div style="display: flex; gap: 12px;">
          ${
            features?.voting
              ? `
            <button class="reflet-vote-btn ${item.hasVoted ? "voted" : ""}" data-vote-id="${item.id}" onclick="event.stopPropagation()">
              <span class="reflet-vote-icon">${upvoteIcon}</span>
              <span class="reflet-vote-count">${item.voteCount}</span>
            </button>
          `
              : ""
          }
          <div style="flex: 1; min-width: 0;">
            <div class="reflet-feedback-title">${escapeHtml(item.title)}</div>
            <div class="reflet-feedback-meta">
              ${
                item.boardStatus
                  ? `
                <span class="reflet-feedback-status" style="background: ${statusColor}20; color: ${statusColor};">
                  <span class="reflet-feedback-status-dot" style="background: ${statusColor};"></span>
                  ${escapeHtml(item.boardStatus.name)}
                </span>
              `
                  : ""
              }
              <span style="display: flex; align-items: center; gap: 4px;">
                ${commentIcon}
                ${item.commentCount}
              </span>
              <span>${formatDate(item.createdAt)}</span>
            </div>
            ${
              item.tags.length > 0
                ? `
              <div class="reflet-tags">
                ${item.tags
                  .map(
                    (tag) =>
                      `<span class="reflet-tag" style="background: ${tag.color}20; color: ${tag.color};">${escapeHtml(tag.name)}</span>`
                  )
                  .join("")}
              </div>
            `
                : ""
            }
          </div>
        </div>
      </div>
    `;
  }

  private getFeedbackDetailHTML(): string {
    const { selectedFeedback, selectedFeedbackComments } = this.state;
    if (!selectedFeedback) {
      return "";
    }

    const statusColor = selectedFeedback.boardStatus?.color ?? "#6b7280";

    return `
      <button class="reflet-back-btn" data-action="back">
        ${backIcon}
        Back to list
      </button>

      <h3 class="reflet-feedback-title" style="font-size: 18px; margin-bottom: 16px;">
        ${escapeHtml(selectedFeedback.title)}
      </h3>

      <div class="reflet-feedback-meta" style="margin-bottom: 16px;">
        ${
          selectedFeedback.boardStatus
            ? `
          <span class="reflet-feedback-status" style="background: ${statusColor}20; color: ${statusColor};">
            <span class="reflet-feedback-status-dot" style="background: ${statusColor};"></span>
            ${escapeHtml(selectedFeedback.boardStatus.name)}
          </span>
        `
            : ""
        }
        <span>${selectedFeedback.voteCount} votes</span>
        <span>${formatDate(selectedFeedback.createdAt)}</span>
      </div>

      <div style="margin-bottom: 24px; line-height: 1.6;">
        ${escapeHtml(selectedFeedback.description)}
      </div>

      <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">
        Comments (${selectedFeedbackComments.length})
      </h4>

      ${this.getCommentsHTML()}

      <div class="reflet-form" style="margin-top: 16px;">
        <textarea class="reflet-form-textarea" placeholder="Add a comment..." rows="3" id="comment-input"></textarea>
        <button class="reflet-submit-btn" data-action="comment">Post Comment</button>
      </div>
    `;
  }

  private getCommentsHTML(): string {
    const { selectedFeedbackComments } = this.state;

    if (selectedFeedbackComments.length === 0) {
      return '<p style="color: #64748b; font-size: 13px;">No comments yet. Be the first to comment!</p>';
    }

    return `
      <div class="reflet-comments">
        ${selectedFeedbackComments
          .map(
            (comment) => `
          <div class="reflet-comment ${comment.isOfficial ? "reflet-comment-official" : ""}">
            <div class="reflet-comment-header">
              <div class="reflet-comment-avatar"></div>
              <span class="reflet-comment-author">${escapeHtml(comment.author?.name ?? "Anonymous")}</span>
              <span class="reflet-comment-time">${formatDate(comment.createdAt)}</span>
            </div>
            <div class="reflet-comment-body">${escapeHtml(comment.body)}</div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  private getCreateFormHTML(): string {
    const isAuthenticated = !!(this.config.user || this.config.userToken);

    if (!isAuthenticated) {
      return `
        <button class="reflet-back-btn" data-action="back">
          ${backIcon}
          Back to list
        </button>

        <div class="reflet-login-prompt">
          <p>Please sign in to submit feedback</p>
          ${
            this.config.loginUrl
              ? `<button class="reflet-login-btn" data-action="login">Sign In</button>`
              : ""
          }
        </div>
      `;
    }

    return `
      <button class="reflet-back-btn" data-action="back">
        ${backIcon}
        Back to list
      </button>

      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">Submit Feedback</h3>

      <form class="reflet-form" data-form="create">
        <div class="reflet-form-group">
          <label class="reflet-form-label" for="feedback-title">Title</label>
          <input type="text" class="reflet-form-input" id="feedback-title" placeholder="Brief summary of your feedback" required />
        </div>

        <div class="reflet-form-group">
          <label class="reflet-form-label" for="feedback-description">Description</label>
          <textarea class="reflet-form-textarea" id="feedback-description" placeholder="Provide more details about your feedback..." required></textarea>
        </div>

        <button type="submit" class="reflet-submit-btn">Submit Feedback</button>
      </form>
    `;
  }

  private getLoadingHTML(): string {
    return `
      <div class="reflet-loading">
        <div class="reflet-spinner"></div>
      </div>
    `;
  }

  private getErrorHTML(): string {
    return `
      <div class="reflet-error">
        <p>${escapeHtml(this.state.error ?? "An error occurred")}</p>
        <button class="reflet-submit-btn" style="margin-top: 12px;" data-action="retry">Retry</button>
      </div>
    `;
  }

  private attachEventListeners(): void {
    if (!this.shadowRoot) {
      return;
    }

    // Launcher click
    const launcher = this.shadowRoot.querySelector(".reflet-launcher");
    if (launcher) {
      launcher.addEventListener("click", () => this.open());
    }

    // Close button
    const closeBtn = this.shadowRoot.querySelector(".reflet-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.close());
    }

    // Navigation
    const navItems = this.shadowRoot.querySelectorAll(".reflet-nav-item");
    for (const item of navItems) {
      item.addEventListener("click", () => {
        const view = item.getAttribute("data-view") as WidgetState["view"];
        if (view) {
          this.state.view = view;
          this.render();
        }
      });
    }

    // Feedback card clicks
    const feedbackCards = this.shadowRoot.querySelectorAll(
      ".reflet-feedback-card"
    );
    for (const card of feedbackCards) {
      card.addEventListener("click", () => {
        const feedbackId = card.getAttribute("data-feedback-id");
        if (feedbackId) {
          this.openFeedbackDetail(feedbackId);
        }
      });
    }

    // Vote buttons
    const voteButtons = this.shadowRoot.querySelectorAll("[data-vote-id]");
    for (const btn of voteButtons) {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const feedbackId = btn.getAttribute("data-vote-id");
        if (feedbackId) {
          await this.handleVote(feedbackId);
        }
      });
    }

    // Action buttons
    const actionButtons = this.shadowRoot.querySelectorAll("[data-action]");
    for (const btn of actionButtons) {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action");
        this.handleAction(action);
      });
    }

    // Create form submit
    const createForm = this.shadowRoot.querySelector('[data-form="create"]');
    if (createForm) {
      createForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        await this.handleCreateSubmit();
      });
    }
  }

  private handleAction(action: string | null): void {
    switch (action) {
      case "create":
        this.state.view = "create";
        this.render();
        break;
      case "back":
        this.state.view = "list";
        this.state.selectedFeedback = null;
        this.state.selectedFeedbackComments = [];
        this.render();
        break;
      case "retry":
        this.state.error = null;
        this.state.isLoading = true;
        this.render();
        this.loadFeedback();
        break;
      case "login":
        if (this.config.loginUrl) {
          const redirectUrl = this.config.loginUrl.replace(
            "{url}",
            encodeURIComponent(window.location.href)
          );
          window.location.href = redirectUrl;
        }
        break;
      case "comment":
        this.handleCommentSubmit();
        break;
      default:
        // Unknown action - ignore
        break;
    }
  }

  private async loadFeedback(): Promise<void> {
    try {
      const result = await this.api.listFeedback({
        sortBy: "votes",
        limit: 50,
      });
      this.state.feedbackItems = result.items;
      this.state.isLoading = false;
      this.render();
    } catch (error) {
      this.state.error =
        error instanceof Error ? error.message : "Failed to load feedback";
      this.state.isLoading = false;
      this.render();
    }
  }

  private async openFeedbackDetail(feedbackId: string): Promise<void> {
    const feedback = this.state.feedbackItems.find((f) => f.id === feedbackId);
    if (!feedback) {
      return;
    }

    this.state.selectedFeedback = feedback;
    this.state.view = "detail";
    this.state.isLoading = true;
    this.render();

    try {
      const comments = await this.api.getComments(feedbackId);
      this.state.selectedFeedbackComments = comments;
    } catch {
      // Ignore error, just show no comments
      this.state.selectedFeedbackComments = [];
    }

    this.state.isLoading = false;
    this.render();
  }

  private async handleVote(feedbackId: string): Promise<void> {
    try {
      const result = await this.api.vote(feedbackId);

      // Update local state
      const feedback = this.state.feedbackItems.find(
        (f) => f.id === feedbackId
      );
      if (feedback) {
        feedback.hasVoted = result.voted;
        feedback.voteCount = result.voteCount;
      }

      this.config.onVote?.(feedbackId, result.voted);
      this.render();
    } catch (error) {
      // Show login prompt if not authenticated
      if (error instanceof Error && error.message.includes("identification")) {
        if (this.config.loginUrl) {
          this.handleAction("login");
        } else {
          this.state.error = "Please sign in to vote";
          this.render();
        }
      }
    }
  }

  private async handleCreateSubmit(): Promise<void> {
    if (!this.shadowRoot) {
      return;
    }

    const titleInput = this.shadowRoot.querySelector(
      "#feedback-title"
    ) as HTMLInputElement;
    const descInput = this.shadowRoot.querySelector(
      "#feedback-description"
    ) as HTMLTextAreaElement;

    if (!(titleInput && descInput)) {
      return;
    }

    const title = titleInput.value.trim();
    const description = descInput.value.trim();

    if (!(title && description)) {
      return;
    }

    try {
      const result = await this.api.createFeedback({ title, description });

      this.config.onFeedbackCreated?.({ id: result.feedbackId, title });

      // Refresh list and go back
      await this.loadFeedback();
      this.state.view = "list";
      this.render();
    } catch (error) {
      this.state.error =
        error instanceof Error ? error.message : "Failed to submit feedback";
      this.render();
    }
  }

  private async handleCommentSubmit(): Promise<void> {
    if (!(this.shadowRoot && this.state.selectedFeedback)) {
      return;
    }

    const input = this.shadowRoot.querySelector(
      "#comment-input"
    ) as HTMLTextAreaElement;
    if (!input) {
      return;
    }

    const body = input.value.trim();
    if (!body) {
      return;
    }

    try {
      await this.api.addComment(this.state.selectedFeedback.id, body);

      // Refresh comments
      const comments = await this.api.getComments(
        this.state.selectedFeedback.id
      );
      this.state.selectedFeedbackComments = comments;
      this.render();

      // Clear input
      const newInput = this.shadowRoot.querySelector(
        "#comment-input"
      ) as HTMLTextAreaElement;
      if (newInput) {
        newInput.value = "";
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("identification")) {
        if (this.config.loginUrl) {
          this.handleAction("login");
        } else {
          this.state.error = "Please sign in to comment";
          this.render();
        }
      }
    }
  }

  open(): void {
    this.state.isOpen = true;
    this.config.onOpen?.();
    this.render();
  }

  close(): void {
    this.state.isOpen = false;
    this.config.onClose?.();
    this.render();
  }

  destroy(): void {
    if (this.container && this.config.mode === "floating") {
      this.container.remove();
      this.container = null;
      this.shadowRoot = null;
    }
  }
}
