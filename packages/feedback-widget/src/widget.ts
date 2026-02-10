import { createApi, type FeedbackApi } from "./api";
import { getWidgetStyles } from "./styles";
import type { WidgetConfig, WidgetState } from "./types";
import { attachWidgetEventListeners } from "./widget-events";
import { renderWidgetHTML } from "./widget-html";
import { generateSimpleToken } from "./widget-utils";

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
      const token = generateSimpleToken(config.user);
      this.api.setUserToken(token);
    }
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
    let resolvedTheme: "light" | "dark" = "light";
    if (theme === "dark") {
      resolvedTheme = "dark";
    } else if (theme === "auto") {
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
    wrapper.innerHTML = renderWidgetHTML(this.state, this.config);
    this.shadowRoot.appendChild(wrapper);
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    if (!this.shadowRoot) {
      return;
    }

    attachWidgetEventListeners(this.shadowRoot, {
      open: () => this.open(),
      close: () => this.close(),
      setView: (view) => {
        this.state.view = view;
        this.render();
      },
      openDetail: (id) => this.openFeedbackDetail(id),
      vote: (id) => this.handleVote(id),
      onAction: (action) => this.handleAction(action),
      onCreateSubmit: () => this.handleCreateSubmit(),
    });
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
