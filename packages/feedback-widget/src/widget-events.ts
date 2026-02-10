import type { WidgetState } from "./types";

export interface WidgetEventCallbacks {
  open: () => void;
  close: () => void;
  setView: (view: WidgetState["view"]) => void;
  openDetail: (id: string) => void;
  vote: (id: string) => Promise<void>;
  onAction: (action: string | null) => void;
  onCreateSubmit: () => Promise<void>;
}

export function attachWidgetEventListeners(
  shadowRoot: ShadowRoot,
  callbacks: WidgetEventCallbacks
): void {
  const launcher = shadowRoot.querySelector(".reflet-launcher");
  if (launcher) {
    launcher.addEventListener("click", () => callbacks.open());
  }

  const closeBtn = shadowRoot.querySelector(".reflet-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => callbacks.close());
  }

  const navItems = Array.from(shadowRoot.querySelectorAll(".reflet-nav-item"));
  for (const item of navItems) {
    item.addEventListener("click", () => {
      const view = item.getAttribute("data-view") as WidgetState["view"];
      if (view) {
        callbacks.setView(view);
      }
    });
  }

  const feedbackCards = Array.from(
    shadowRoot.querySelectorAll(".reflet-feedback-card")
  );
  for (const card of feedbackCards) {
    card.addEventListener("click", () => {
      const feedbackId = card.getAttribute("data-feedback-id");
      if (feedbackId) {
        callbacks.openDetail(feedbackId);
      }
    });
  }

  const voteButtons = Array.from(shadowRoot.querySelectorAll("[data-vote-id]"));
  for (const btn of voteButtons) {
    btn.addEventListener("click", async (e: Event) => {
      e.stopPropagation();
      const feedbackId = btn.getAttribute("data-vote-id");
      if (feedbackId) {
        await callbacks.vote(feedbackId);
      }
    });
  }

  const actionButtons = Array.from(
    shadowRoot.querySelectorAll("[data-action]")
  );
  for (const btn of actionButtons) {
    btn.addEventListener("click", () => {
      callbacks.onAction(btn.getAttribute("data-action"));
    });
  }

  const createForm = shadowRoot.querySelector('[data-form="create"]');
  if (createForm) {
    createForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await callbacks.onCreateSubmit();
    });
  }
}
