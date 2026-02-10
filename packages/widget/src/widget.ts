import {
  fetchMessages,
  fetchUnreadCount,
  fetchWidgetConfig,
  getOrCreateConversation,
  markMessagesAsRead,
  sendMessage,
} from "./api";
import { getWidgetStyles } from "./styles";
import type { WidgetMessage, WidgetState } from "./types";
import { renderWidgetHTML } from "./widget-html";
import { generateVisitorId } from "./widget-utils";

const STORAGE_KEY_VISITOR = "reflet_visitor_id";
const STORAGE_KEY_CONVERSATION = "reflet_conversation_id";
const POLL_INTERVAL = 5000;

export class RefletWidget {
  private readonly widgetId: string;
  private container: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private pollTimer: number | null = null;
  private readonly state: WidgetState = {
    isOpen: false,
    isLoading: true,
    config: null,
    conversationId: null,
    visitorId: null,
    messages: [],
    unreadCount: 0,
  };

  constructor(widgetId: string) {
    this.widgetId = widgetId;
  }

  async init(): Promise<void> {
    const config = await fetchWidgetConfig(this.widgetId);
    if (!config) {
      return;
    }

    this.state.config = config;
    this.state.visitorId = this.getOrCreateVisitorId();
    this.state.conversationId = this.getStoredConversationId();

    this.createContainer();
    this.injectStyles();
    this.render();

    if (config.autoOpen) {
      this.open();
    }

    if (this.state.conversationId) {
      await this.loadMessages();
      this.startPolling();
    }
  }

  private getOrCreateVisitorId(): string {
    let visitorId = localStorage.getItem(STORAGE_KEY_VISITOR);
    if (!visitorId) {
      visitorId = generateVisitorId();
      localStorage.setItem(STORAGE_KEY_VISITOR, visitorId);
    }
    return visitorId;
  }

  private getStoredConversationId(): string | null {
    return localStorage.getItem(`${STORAGE_KEY_CONVERSATION}_${this.widgetId}`);
  }

  private storeConversationId(id: string): void {
    localStorage.setItem(`${STORAGE_KEY_CONVERSATION}_${this.widgetId}`, id);
  }

  private createContainer(): void {
    this.container = document.createElement("div");
    this.container.id = "reflet-widget-root";
    this.shadowRoot = this.container.attachShadow({ mode: "closed" });
    document.body.appendChild(this.container);
  }

  private injectStyles(): void {
    if (!(this.shadowRoot && this.state.config)) {
      return;
    }

    const style = document.createElement("style");
    style.textContent = getWidgetStyles(
      this.state.config.primaryColor,
      this.state.config.zIndex
    );
    this.shadowRoot.appendChild(style);
  }

  private render(): void {
    if (!this.shadowRoot) {
      return;
    }

    const existingContainer = this.shadowRoot.querySelector(
      ".reflet-widget-container"
    );
    if (existingContainer) {
      existingContainer.remove();
    }

    const wrapper = document.createElement("div");
    wrapper.className = "reflet-widget-container";
    wrapper.innerHTML = this.getHTML();
    this.shadowRoot.appendChild(wrapper);
    this.attachEventListeners();
  }

  private getHTML(): string {
    const { config, isOpen, messages, unreadCount, isLoading } = this.state;
    if (!config) {
      return "";
    }

    return renderWidgetHTML(config, isOpen, messages, unreadCount, isLoading);
  }

  private attachEventListeners(): void {
    if (!this.shadowRoot) {
      return;
    }

    const launcher = this.shadowRoot.querySelector(".reflet-launcher");
    if (launcher) {
      launcher.addEventListener("click", () => this.open());
    }

    const closeBtn = this.shadowRoot.querySelector(".reflet-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.close());
    }

    const sendBtn = this.shadowRoot.querySelector(".reflet-send-btn");
    const input = this.shadowRoot.querySelector(
      ".reflet-input"
    ) as HTMLTextAreaElement | null;

    if (sendBtn && input) {
      sendBtn.addEventListener("click", () => this.handleSend(input));
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.handleSend(input);
        }
      });

      input.addEventListener("input", () => {
        input.style.height = "auto";
        input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
      });
    }
  }

  private async open(): Promise<void> {
    this.state.isOpen = true;
    this.state.isLoading = true;
    this.render();

    if (!this.state.conversationId && this.state.visitorId) {
      const result = await getOrCreateConversation(
        this.widgetId,
        this.state.visitorId,
        {
          userAgent: navigator.userAgent,
          url: window.location.href,
          referrer: document.referrer || undefined,
        }
      );

      if (result) {
        this.state.conversationId = result.conversationId;
        this.storeConversationId(result.conversationId);
      }
    }

    await this.loadMessages();
    this.state.isLoading = false;
    this.render();
    this.scrollToBottom();
    this.startPolling();

    if (this.state.conversationId && this.state.visitorId) {
      await markMessagesAsRead(
        this.widgetId,
        this.state.visitorId,
        this.state.conversationId
      );
      this.state.unreadCount = 0;
    }
  }

  private close(): void {
    this.state.isOpen = false;
    this.stopPolling();
    this.render();
  }

  private async handleSend(input: HTMLTextAreaElement): Promise<void> {
    const body = input.value.trim();
    if (!(body && this.state.visitorId && this.state.conversationId)) {
      return;
    }

    input.value = "";
    input.style.height = "auto";

    const tempMessage: WidgetMessage = {
      id: `temp_${Date.now()}`,
      body,
      senderType: "user",
      isOwnMessage: true,
      createdAt: Date.now(),
    };
    this.state.messages.push(tempMessage);
    this.render();
    this.scrollToBottom();

    const result = await sendMessage(
      this.widgetId,
      this.state.visitorId,
      this.state.conversationId,
      body
    );

    if (result) {
      await this.loadMessages();
      this.render();
      this.scrollToBottom();
    }
  }

  private async loadMessages(): Promise<void> {
    if (!(this.state.visitorId && this.state.conversationId)) {
      return;
    }

    const messages = await fetchMessages(
      this.widgetId,
      this.state.visitorId,
      this.state.conversationId
    );
    this.state.messages = messages;
  }

  private scrollToBottom(): void {
    if (!this.shadowRoot) {
      return;
    }
    const messagesContainer = this.shadowRoot.querySelector(".reflet-messages");
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollTimer = window.setInterval(() => {
      this.poll();
    }, POLL_INTERVAL);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async poll(): Promise<void> {
    if (!(this.state.visitorId && this.state.conversationId)) {
      return;
    }

    if (this.state.isOpen) {
      const previousCount = this.state.messages.length;
      await this.loadMessages();

      if (this.state.messages.length > previousCount) {
        this.render();
        this.scrollToBottom();
        await markMessagesAsRead(
          this.widgetId,
          this.state.visitorId,
          this.state.conversationId
        );
      }
    } else {
      const unreadCount = await fetchUnreadCount(
        this.widgetId,
        this.state.visitorId,
        this.state.conversationId
      );

      if (unreadCount !== this.state.unreadCount) {
        this.state.unreadCount = unreadCount;
        this.render();
      }
    }
  }

  destroy(): void {
    this.stopPolling();
    if (this.container) {
      this.container.remove();
      this.container = null;
      this.shadowRoot = null;
    }
  }
}
