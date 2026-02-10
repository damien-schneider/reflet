import { chatIcon, closeIcon, messageIcon, sendIcon } from "./icons";
import type { WidgetConfig, WidgetMessage } from "./types";
import { escapeHtml, formatTime } from "./widget-utils";

export function renderWidgetHTML(
  config: WidgetConfig,
  isOpen: boolean,
  messages: WidgetMessage[],
  unreadCount: number,
  isLoading: boolean
): string {
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
            <h3 class="reflet-header-title">${config.welcomeMessage}</h3>
            ${config.greetingMessage ? `<p class="reflet-header-subtitle">${config.greetingMessage}</p>` : ""}
          </div>
          <button class="reflet-close-btn" aria-label="Close chat">
            ${closeIcon}
          </button>
        </div>
        
        <div class="reflet-messages">
          ${isLoading ? '<div class="reflet-loading"><div class="reflet-spinner"></div></div>' : ""}
          ${!isLoading && messages.length === 0 ? renderEmptyStateHTML() : ""}
          ${messages.map((msg) => renderMessageHTML(msg)).join("")}
        </div>
        
        <div class="reflet-input-container">
          <textarea 
            class="reflet-input" 
            placeholder="Type a message..." 
            rows="1"
            aria-label="Message input"
          ></textarea>
          <button class="reflet-send-btn" aria-label="Send message">
            ${sendIcon}
          </button>
        </div>
        
        <div class="reflet-powered-by">
          Powered by <a href="https://reflet.app" target="_blank" rel="noopener">Reflet</a>
        </div>
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

function renderMessageHTML(message: WidgetMessage): string {
  const className = message.isOwnMessage
    ? "reflet-message own"
    : "reflet-message other";

  return `
    <div class="${className}">
      <div class="reflet-message-body">${escapeHtml(message.body)}</div>
      <div class="reflet-message-time">${formatTime(message.createdAt)}</div>
    </div>
  `;
}
