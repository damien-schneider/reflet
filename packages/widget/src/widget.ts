import {
  fetchConversation,
  fetchMessages,
  fetchUnreadCount,
  fetchWidgetConfig,
  markMessagesAsRead,
  sendMessage,
  setEmail,
} from "./api";
import { getWidgetStyles } from "./styles";
import type { WidgetState } from "./types";
import { renderWidgetHTML } from "./widget-html";
import { generateVisitorId } from "./widget-utils";

const STORAGE_KEY_VISITOR = "reflet_visitor_id";
const POLL_INTERVAL = 5000;

const readOrCreateVisitorId = (): string => {
  const stored = localStorage.getItem(STORAGE_KEY_VISITOR);
  if (stored) {
    return stored;
  }
  const visitorId = generateVisitorId();
  localStorage.setItem(STORAGE_KEY_VISITOR, visitorId);
  return visitorId;
};

export class RefletWidget {
  private readonly widgetId: string;
  private container: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private pollTimer: number | null = null;
  private readonly state: WidgetState = {
    config: null,
    draft: "",
    emailDraft: "",
    emailPrompt: "awaitingFirstMessage",
    hasConversation: false,
    isLoading: true,
    isOpen: false,
    messages: [],
    sendFailed: false,
    unreadCount: 0,
    visitorId: "",
  };

  constructor(widgetId: string) {
    this.widgetId = widgetId;
  }

  private get visitor() {
    return { visitorId: this.state.visitorId, widgetId: this.widgetId };
  }

  async init(): Promise<void> {
    const config = await fetchWidgetConfig(this.widgetId).catch(
      (error: unknown) => {
        console.error("[Reflet Widget] Could not load the widget", error);
        return null;
      }
    );
    if (!config) {
      return;
    }

    this.state.config = config;
    this.state.visitorId = readOrCreateVisitorId();

    this.createContainer();
    this.injectStyles();
    this.render();

    if (config.autoOpen) {
      this.open();
    }

    const conversation = await fetchConversation(this.visitor).catch(
      () => null
    );
    if (conversation) {
      this.state.hasConversation = true;
      this.state.emailPrompt = conversation.guestEmail ? "emailOnFile" : "form";
      await this.refreshUnreadCount();
      this.startPolling();
    }
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
    if (!(this.shadowRoot && this.state.config)) {
      return;
    }

    this.shadowRoot.querySelector(".reflet-widget-container")?.remove();

    const wrapper = document.createElement("div");
    wrapper.className = "reflet-widget-container";
    wrapper.innerHTML = renderWidgetHTML(this.state.config, this.state);
    this.shadowRoot.appendChild(wrapper);
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    if (!this.shadowRoot) {
      return;
    }

    this.shadowRoot
      .querySelector(".reflet-launcher")
      ?.addEventListener("click", () => this.open());
    this.shadowRoot
      .querySelector(".reflet-close-btn")
      ?.addEventListener("click", () => this.close());

    const emailForm = this.shadowRoot.querySelector(".reflet-email-form");
    const emailInput = this.shadowRoot.querySelector(".reflet-email-input");
    if (emailForm && emailInput instanceof HTMLInputElement) {
      emailInput.addEventListener("input", () => {
        this.state.emailDraft = emailInput.value;
      });
      emailForm.addEventListener("submit", (event) => {
        event.preventDefault();
        this.handleEmailSubmit(emailInput.value.trim());
      });
    }

    const sendBtn = this.shadowRoot.querySelector(".reflet-send-btn");
    const input = this.shadowRoot.querySelector(".reflet-input");
    if (!(sendBtn && input instanceof HTMLTextAreaElement)) {
      return;
    }

    sendBtn.addEventListener("click", () => this.handleSend(input));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleSend(input);
      }
    });
    input.addEventListener("input", () => {
      this.state.draft = input.value;
      input.style.height = "auto";
      input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    });
  }

  private async open(): Promise<void> {
    this.state.isOpen = true;
    this.state.isLoading = this.state.hasConversation;
    this.render();

    if (!this.state.hasConversation) {
      return;
    }

    await this.loadMessages();
    this.state.isLoading = false;
    this.render();
    this.scrollToBottom();
    this.startPolling();
    await this.markRead();
  }

  private close(): void {
    this.state.isOpen = false;
    this.render();
  }

  private async handleSend(input: HTMLTextAreaElement): Promise<void> {
    const body = input.value.trim();
    if (!body) {
      return;
    }

    const tempMessageId = `temp_${Date.now()}`;
    this.state.draft = "";
    this.state.sendFailed = false;
    this.state.messages.push({
      attachments: [],
      body,
      createdAt: Date.now(),
      id: tempMessageId,
      isOwnMessage: true,
      senderType: "user",
    });
    this.render();
    this.scrollToBottom();

    try {
      await sendMessage(this.visitor, body, {
        referrer: document.referrer || undefined,
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    } catch {
      this.state.messages = this.state.messages.filter(
        (message) => message.id !== tempMessageId
      );
      this.state.draft = body;
      this.state.sendFailed = true;
      this.render();
      return;
    }

    this.state.hasConversation = true;
    if (this.state.emailPrompt === "awaitingFirstMessage") {
      this.state.emailPrompt = "form";
    }
    this.startPolling();
    await this.loadMessages();
    this.render();
    this.scrollToBottom();
  }

  private async handleEmailSubmit(email: string): Promise<void> {
    if (!email) {
      return;
    }
    this.state.emailDraft = email;
    this.state.emailPrompt = "saving";
    this.render();

    try {
      const { confirmationRequired } = await setEmail(this.visitor, email);
      this.state.emailPrompt = confirmationRequired
        ? "confirmationSent"
        : "subscribed";
    } catch {
      this.state.emailPrompt = "failed";
    }
    this.render();
    this.scrollToBottom();
  }

  private async loadMessages(): Promise<void> {
    this.state.messages = await fetchMessages(this.visitor).catch(
      () => this.state.messages
    );
  }

  private async markRead(): Promise<void> {
    await markMessagesAsRead(this.visitor).catch(() => false);
    this.state.unreadCount = 0;
  }

  private async refreshUnreadCount(): Promise<void> {
    const unreadCount = await fetchUnreadCount(this.visitor).catch(
      () => this.state.unreadCount
    );
    if (unreadCount !== this.state.unreadCount) {
      this.state.unreadCount = unreadCount;
      this.render();
    }
  }

  private scrollToBottom(): void {
    const messagesContainer =
      this.shadowRoot?.querySelector(".reflet-messages");
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
    if (!this.state.isOpen) {
      await this.refreshUnreadCount();
      return;
    }

    const previousCount = this.state.messages.length;
    await this.loadMessages();
    if (this.state.messages.length > previousCount) {
      this.render();
      this.scrollToBottom();
      await this.markRead();
    }
  }

  destroy(): void {
    this.stopPolling();
    this.container?.remove();
    this.container = null;
    this.shadowRoot = null;
  }
}
