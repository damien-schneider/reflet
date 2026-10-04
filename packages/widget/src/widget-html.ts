import { chatIcon, closeIcon, messageIcon, sendIcon } from "./icons";
import type {
  EmailPrompt,
  WidgetAttachment,
  WidgetConfig,
  WidgetMessage,
  WidgetState,
} from "./types";
import { escapeHtml, formatTime } from "./widget-utils";

export function renderWidgetHTML(
  config: WidgetConfig,
  state: WidgetState
): string {
  const {
    draft,
    emailDraft,
    emailPrompt,
    isLoading,
    isOpen,
    messages,
    sendFailed,
    unreadCount,
  } = state;
  const positionClass = config.position;

  let html = "";

  if (config.showLauncher && !isOpen) {
    html += `
      <button class="reflet-launcher ${positionClass}" aria-label="Open chat">
        <span class="reflet-launcher-icon">${chatIcon}</span>
        ${unreadCount > 0 ? `<span class="reflet-launcher-badge">${unreadCount > 99 ? "99+" : unreadCount}</span>` : ""}
      </button>
    `;
  }

  if (isOpen) {
    html += `
      <div class="reflet-window ${positionClass}">
        <div class="reflet-header">
          <div class="reflet-header-content">
            <h3 class="reflet-header-title">${escapeHtml(config.welcomeMessage)}</h3>
            ${config.greetingMessage ? `<p class="reflet-header-subtitle">${escapeHtml(config.greetingMessage)}</p>` : ""}
          </div>
          <button class="reflet-close-btn" aria-label="Close chat">
            ${closeIcon}
          </button>
        </div>
        
        <div class="reflet-messages">
          ${isLoading ? '<div class="reflet-loading"><div class="reflet-spinner"></div></div>' : ""}
          ${!isLoading && messages.length === 0 ? renderEmptyStateHTML() : ""}
          ${messages.map((msg) => renderMessageHTML(msg)).join("")}
          ${renderEmailPromptHTML(emailPrompt, emailDraft)}
        </div>
        
        ${sendFailed ? '<p class="reflet-send-error" role="alert">Message not sent — try again</p>' : ""}
        <div class="reflet-input-container">
          <textarea 
            class="reflet-input" 
            placeholder="Type a message..." 
            rows="1"
            aria-label="Message input"
          >${escapeHtml(draft)}</textarea>
          <button class="reflet-send-btn" aria-label="Send message">
            ${sendIcon}
          </button>
        </div>
        
        ${
          config.hideBranding
            ? ""
            : `<div class="reflet-powered-by">
          Powered by <a href="https://reflet.app" target="_blank" rel="noopener">Reflet</a>
        </div>`
        }
      </div>
    `;
  }

  return html;
}

function renderEmptyStateHTML(): string {
  return `
    <div class="reflet-empty-state">
      <div class="reflet-empty-icon">${messageIcon}</div>
      <p>Start a conversation with us!</p>
      <p>We typically respond within a few hours.</p>
    </div>
  `;
}

function renderAttachmentHTML(attachment: WidgetAttachment): string {
  const filename = escapeHtml(attachment.filename);
  if (!attachment.url) {
    return `<span class="reflet-attachment skipped">Unsupported attachment: ${filename}</span>`;
  }
  return `<a class="reflet-attachment" href="${escapeHtml(attachment.url)}" target="_blank" rel="noopener noreferrer">${filename}</a>`;
}

function renderMessageHTML(message: WidgetMessage): string {
  const className = message.isOwnMessage
    ? "reflet-message own"
    : "reflet-message other";
  const attachments = message.attachments.length
    ? `<div class="reflet-attachments">${message.attachments.map(renderAttachmentHTML).join("")}</div>`
    : "";

  return `
    <div class="${className}">
      <div class="reflet-message-body">${escapeHtml(message.body)}</div>
      ${attachments}
      <div class="reflet-message-time">${formatTime(message.createdAt)}</div>
    </div>
  `;
}

const EMAIL_PROMPT_NOTES: Partial<Record<EmailPrompt, string>> = {
  confirmationSent: "Check your inbox to confirm your email",
  subscribed: "We'll email you replies",
};

const EMAIL_FORM_PROMPTS: Partial<Record<EmailPrompt, true>> = {
  failed: true,
  form: true,
  saving: true,
};

function renderEmailPromptHTML(
  prompt: EmailPrompt,
  emailDraft: string
): string {
  const note = EMAIL_PROMPT_NOTES[prompt];
  if (note) {
    return `<p class="reflet-email-card reflet-email-note" role="status">${note}</p>`;
  }
  if (!EMAIL_FORM_PROMPTS[prompt]) {
    return "";
  }
  const isSaving = prompt === "saving";
  return `
    <form class="reflet-email-card reflet-email-form">
      <label class="reflet-email-label" for="reflet-email-input">Get replies by email</label>
      <div class="reflet-email-row">
        <input id="reflet-email-input" class="reflet-email-input" type="email" autocomplete="email" required maxlength="254" placeholder="you@example.com" value="${escapeHtml(emailDraft)}" ${isSaving ? "disabled" : ""} />
        <button class="reflet-email-btn" type="submit" ${isSaving ? "disabled" : ""}>${isSaving ? "Saving…" : "Notify me"}</button>
      </div>
      ${prompt === "failed" ? '<p class="reflet-send-error" role="alert">Could not save your email — check it and try again</p>' : ""}
    </form>
  `;
}
