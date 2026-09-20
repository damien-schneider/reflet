import { DEFAULT_STATUS_COLOR } from "./color-utils";
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

  let html = "";

  if (mode === "floating" && !state.isOpen) {
    html += `
      <button class="reflet-launcher ${position}" type="button" aria-label="Open feedback">
        <span class="reflet-launcher-icon">${feedbackIcon}</span>
      </button>
    `;
  }

  if (state.isOpen || mode === "inline") {
    html += renderWindowHTML(state, config);
  }

  return html;
}

function renderWindowHTML(state: WidgetState, config: WidgetConfig): string {
  const { mode, position } = config;
  const { isLoading, boardConfig, error } = state;
  const isFloating = mode === "floating";
  const title = boardConfig?.name ?? "Feedback";
  const windowClass =
    mode === "inline" ? "reflet-window inline" : `reflet-window ${position}`;
  const dialogAttrs = isFloating
    ? ` role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}"`
    : "";

  return `
    <div class="${windowClass}"${dialogAttrs}>
      <div class="reflet-header">
        <div class="reflet-header-content">
          <h3 class="reflet-header-title">${escapeHtml(title)}</h3>
          ${boardConfig?.description ? `<p class="reflet-header-subtitle">${escapeHtml(boardConfig.description)}</p>` : ""}
        </div>
        ${isFloating ? `<button class="reflet-close-btn" type="button" aria-label="Close">${closeIcon}</button>` : ""}
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
      <button class="reflet-submit-btn reflet-submit-btn-block" data-action="create" type="button">
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
  const statusColor = item.boardStatus?.color ?? DEFAULT_STATUS_COLOR;

  return `
    <div class="reflet-feedback-card">
      <button class="reflet-feedback-open" data-feedback-id="${item.id}" type="button" aria-label="${escapeHtml(item.title)}"></button>
      <div class="reflet-feedback-row">
        ${
          features?.voting
            ? `
          <button class="reflet-vote-btn ${item.hasVoted ? "voted" : ""}" data-vote-id="${item.id}" type="button" aria-label="Upvote">
            <span class="reflet-vote-icon">${upvoteIcon}</span>
            <span class="reflet-vote-count">${item.voteCount}</span>
          </button>
        `
            : ""
        }
        <div class="reflet-feedback-main">
          <div class="reflet-feedback-title">${escapeHtml(item.title)}</div>
          <div class="reflet-feedback-meta">
            ${
              item.boardStatus
                ? `
              <span class="reflet-feedback-status" style="--reflet-chip-color: ${statusColor}">
                <span class="reflet-feedback-status-dot"></span>
                ${escapeHtml(item.boardStatus.name)}
              </span>
            `
                : ""
            }
            <span class="reflet-feedback-comments">
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
                    `<span class="reflet-tag" style="--reflet-chip-color: ${tag.color}">${escapeHtml(tag.name)}</span>`
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

  const statusColor =
    selectedFeedback.boardStatus?.color ?? DEFAULT_STATUS_COLOR;

  return `
    <button class="reflet-back-btn" data-action="back" type="button">
      ${backIcon}
      Back to list
    </button>

    <h3 class="reflet-feedback-title reflet-detail-title">
      ${escapeHtml(selectedFeedback.title)}
    </h3>

    <div class="reflet-feedback-meta reflet-detail-meta">
      ${
        selectedFeedback.boardStatus
          ? `
        <span class="reflet-feedback-status" style="--reflet-chip-color: ${statusColor}">
          <span class="reflet-feedback-status-dot"></span>
          ${escapeHtml(selectedFeedback.boardStatus.name)}
        </span>
      `
          : ""
      }
      <span>${selectedFeedback.voteCount} votes</span>
      <span>${formatDate(selectedFeedback.createdAt)}</span>
    </div>

    <div class="reflet-detail-body">
      ${escapeHtml(selectedFeedback.description)}
    </div>

    <h4 class="reflet-detail-heading">
      Comments (${selectedFeedbackComments.length})
    </h4>

    ${renderCommentsHTML(selectedFeedbackComments)}

    <div class="reflet-form reflet-detail-form">
      <textarea class="reflet-form-textarea" placeholder="Add a comment..." rows="3" id="comment-input"></textarea>
      <button class="reflet-submit-btn" data-action="comment" type="button">Post Comment</button>
    </div>
  `;
}

function renderCommentsHTML(comments: Comment[]): string {
  if (comments.length === 0) {
    return '<p class="reflet-muted-note">No comments yet. Be the first to comment!</p>';
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
      <button class="reflet-back-btn" data-action="back" type="button">
        ${backIcon}
        Back to list
      </button>

      <div class="reflet-login-prompt">
        <p>Please sign in to submit feedback</p>
        ${
          config.loginUrl
            ? '<button class="reflet-login-btn" data-action="login" type="button">Sign In</button>'
            : ""
        }
      </div>
    `;
  }

  return `
    <button class="reflet-back-btn" data-action="back" type="button">
      ${backIcon}
      Back to list
    </button>

    <h3 class="reflet-detail-heading">Submit Feedback</h3>

    <form class="reflet-form" data-form="create">
      <div class="reflet-form-group">
        <label class="reflet-form-label" for="feedback-title">Title</label>
        <input type="text" class="reflet-form-input" id="feedback-title" placeholder="Brief summary of your feedback" required />
      </div>

      <div class="reflet-form-group">
        <label class="reflet-form-label" for="feedback-description">Description</label>
        <textarea class="reflet-form-textarea" id="feedback-description" placeholder="Provide more details about your feedback..." required></textarea>
      </div>

      <div class="reflet-form-actions">
        <button type="button" class="reflet-screenshot-btn" data-action="screenshot">📷 Capture Screenshot</button>
        <button type="submit" class="reflet-submit-btn">Submit Feedback</button>
      </div>
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
      <button class="reflet-submit-btn reflet-retry-btn" data-action="retry" type="button">Retry</button>
    </div>
  `;
}
