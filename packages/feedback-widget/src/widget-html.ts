import {
  backIcon,
  closeIcon,
  commentIcon,
  emptyIcon,
  feedbackIcon,
  plusIcon,
  upvoteIcon,
} from "./icons";
import type { Comment, FeedbackItem, WidgetConfig, WidgetState } from "./types";
import { escapeHtml, formatDate } from "./widget-utils";

export function renderWidgetHTML(
  state: WidgetState,
  config: WidgetConfig
): string {
  const { mode, position } = config;
  const { isOpen, isLoading, boardConfig, error } = state;

  let html = "";

  if (mode === "floating" && !isOpen) {
    html += `
      <button class="reflet-launcher ${position}" aria-label="Open feedback">
        <span class="reflet-launcher-icon">${feedbackIcon}</span>
      </button>
    `;
  }

  if (isOpen || mode === "inline") {
    const windowClass =
      mode === "inline" ? "reflet-window inline" : `reflet-window ${position}`;

    html += `
      <div class="${windowClass}">
        <div class="reflet-header">
          <div class="reflet-header-content">
            <h3 class="reflet-header-title">${boardConfig?.name ?? "Feedback"}</h3>
            ${boardConfig?.description ? `<p class="reflet-header-subtitle">${escapeHtml(boardConfig.description)}</p>` : ""}
          </div>
          ${mode === "floating" ? `<button class="reflet-close-btn" aria-label="Close">${closeIcon}</button>` : ""}
        </div>

        ${renderNavHTML(config, state.view)}

        <div class="reflet-content">
          ${isLoading ? renderLoadingHTML() : ""}
          ${error ? renderErrorHTML(error) : ""}
          ${isLoading || error ? "" : renderViewHTML(state, config)}
        </div>

        <div class="reflet-footer">
          Powered by <a href="https://reflet.app" target="_blank" rel="noopener">Reflet</a>
        </div>
      </div>
    `;
  }

  return html;
}

function renderNavHTML(
  config: WidgetConfig,
  view: WidgetState["view"]
): string {
  const { features } = config;

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

function renderViewHTML(state: WidgetState, config: WidgetConfig): string {
  const { view } = state;

  switch (view) {
    case "list":
      return renderFeedbackListHTML(config, state);
    case "detail":
      return renderFeedbackDetailHTML(state);
    case "create":
      return renderCreateFormHTML(config);
    default:
      return renderFeedbackListHTML(config, state);
  }
}

function renderFeedbackListHTML(
  config: WidgetConfig,
  state: WidgetState
): string {
  const { features } = config;
  const { feedbackItems } = state;

  let html = "";

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
    html += renderFeedbackCardHTML(item, config.features);
  }
  html += "</div>";

  return html;
}

function renderFeedbackCardHTML(
  item: FeedbackItem,
  features: WidgetConfig["features"]
): string {
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

function renderFeedbackDetailHTML(state: WidgetState): string {
  const { selectedFeedback, selectedFeedbackComments } = state;
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

    ${renderCommentsHTML(selectedFeedbackComments)}

    <div class="reflet-form" style="margin-top: 16px;">
      <textarea class="reflet-form-textarea" placeholder="Add a comment..." rows="3" id="comment-input"></textarea>
      <button class="reflet-submit-btn" data-action="comment">Post Comment</button>
    </div>
  `;
}

function renderCommentsHTML(comments: Comment[]): string {
  if (comments.length === 0) {
    return '<p style="color: #64748b; font-size: 13px;">No comments yet. Be the first to comment!</p>';
  }

  return `
    <div class="reflet-comments">
      ${comments
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

function renderCreateFormHTML(config: WidgetConfig): string {
  const isAuthenticated = !!(config.user || config.userToken);

  if (!isAuthenticated) {
    return `
      <button class="reflet-back-btn" data-action="back">
        ${backIcon}
        Back to list
      </button>

      <div class="reflet-login-prompt">
        <p>Please sign in to submit feedback</p>
        ${
          config.loginUrl
            ? '<button class="reflet-login-btn" data-action="login">Sign In</button>'
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

function renderLoadingHTML(): string {
  return `
    <div class="reflet-loading">
      <div class="reflet-spinner"></div>
    </div>
  `;
}

function renderErrorHTML(error: string | null): string {
  return `
    <div class="reflet-error">
      <p>${escapeHtml(error ?? "An error occurred")}</p>
      <button class="reflet-submit-btn" style="margin-top: 12px;" data-action="retry">Retry</button>
    </div>
  `;
}
