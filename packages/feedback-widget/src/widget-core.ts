import { createApi, type FeedbackApi } from "./api";
import { DEFAULT_PRIMARY_COLOR } from "./color-utils";
import { ModalFocusManager } from "./modal-focus";
import { getWidgetStyles } from "./styles";
import type { SurveyRenderer } from "./survey-renderer";
import type { SurveyData, WidgetConfig, WidgetState } from "./types";
import { attachWidgetEventListeners } from "./widget-events";
import { renderWidgetHTML } from "./widget-html";
import { generateSimpleToken } from "./widget-utils";

export abstract class WidgetCore {
  protected abstract loadFeedback(): Promise<void>;
  protected abstract openFeedbackDetail(feedbackId: string): Promise<void>;
  protected abstract handleVote(feedbackId: string): Promise<void>;
  protected abstract handleCreateSubmit(): Promise<void>;
  protected abstract handleCommentSubmit(): Promise<void>;
  protected abstract handleScreenshotCapture(): Promise<void>;

  protected readonly config: WidgetConfig;
  protected readonly api: FeedbackApi;
  protected container: HTMLElement | null = null;
  protected shadowRoot: ShadowRoot | null = null;
  protected pendingScreenshot: Blob | null = null;
  protected activeSurvey: SurveyData | null = null;
  protected surveyRenderer: SurveyRenderer | null = null;
  protected focusManager: ModalFocusManager | null = null;
  protected readonly state: WidgetState = {
    boardConfig: null,
    error: null,
    feedbackItems: [],
    isLoading: true,
    isOpen: false,
    selectedFeedback: null,
    selectedFeedbackComments: [],
    view: "list",
  };

  constructor(config: WidgetConfig) {
    this.config = {
      features: {
        changelog: false,
        comments: true,
        createFeedback: true,
        roadmap: false,
        voting: true,
      },
      mode: "floating",
      position: "bottom-right",
      primaryColor: DEFAULT_PRIMARY_COLOR,
      theme: "light",
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

  protected createContainer(): void {
    const { mode, targetId } = this.config;

    if (mode === "inline" && targetId) {
      const target = document.getElementById(targetId);
      if (target) {
        this.container = target;
        this.shadowRoot = this.container.attachShadow({ mode: "closed" });
        this.state.isOpen = true;
        return;
      }
    }

    this.container = document.createElement("div");
    this.container.id = "reflet-feedback-widget-root";
    this.shadowRoot = this.container.attachShadow({ mode: "closed" });
    document.body.appendChild(this.container);
    this.focusManager = new ModalFocusManager(
      this.shadowRoot,
      this.container,
      () => this.close()
    );
  }

  protected injectStyles(): void {
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
      primaryColor ?? DEFAULT_PRIMARY_COLOR,
      resolvedTheme
    );
    this.shadowRoot.appendChild(style);
  }

  protected render(): void {
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
    this.syncModalFocus();
  }

  private syncModalFocus(): void {
    const manager = this.focusManager;
    if (!(manager && this.shadowRoot) || this.config.mode !== "floating") {
      return;
    }
    const windowEl =
      this.shadowRoot.querySelector<HTMLElement>(".reflet-window");
    if (this.state.isOpen && windowEl) {
      manager.attach(windowEl);
      return;
    }
    manager.release(
      this.shadowRoot.querySelector<HTMLElement>(".reflet-launcher")
    );
  }

  protected attachEventListeners(): void {
    if (!this.shadowRoot) {
      return;
    }

    attachWidgetEventListeners(this.shadowRoot, {
      close: () => this.close(),
      onAction: (action) => this.handleAction(action),
      onCreateSubmit: () => this.handleCreateSubmit(),
      open: () => this.open(),
      openDetail: (id) => this.openFeedbackDetail(id),
      setView: (view) => {
        this.state.view = view;
        this.render();
      },
      vote: (id) => this.handleVote(id),
    });
  }

  protected handleAction(action: string | null): void {
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
      case "screenshot":
        this.handleScreenshotCapture();
        break;
      default:
        // Unknown action - ignore
        break;
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
    this.focusManager?.release();
    this.focusManager = null;
    if (this.container && this.config.mode === "floating") {
      this.container.remove();
      this.container = null;
      this.shadowRoot = null;
    }
  }
}
