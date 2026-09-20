const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export class ModalFocusManager {
  private readonly root: ShadowRoot;
  private readonly host: HTMLElement;
  private readonly onEscape: () => void;
  private readonly inerted: HTMLElement[] = [];
  private container: HTMLElement | null = null;
  private previousFocus: HTMLElement | null = null;

  constructor(root: ShadowRoot, host: HTMLElement, onEscape: () => void) {
    this.root = root;
    this.host = host;
    this.onEscape = onEscape;
  }

  attach(container: HTMLElement): void {
    const wasActive = this.container !== null;
    this.container = container;

    if (wasActive) {
      if (!this.root.activeElement) {
        this.focusFirst();
      }
      return;
    }

    this.previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    this.inertBackground();
    document.addEventListener("keydown", this.handleKeyDown, true);
    this.focusFirst();
  }

  release(fallback?: HTMLElement | null): void {
    if (!this.container) {
      return;
    }
    this.container = null;
    document.removeEventListener("keydown", this.handleKeyDown, true);

    for (const element of this.inerted) {
      element.inert = false;
    }
    this.inerted.length = 0;

    const restore = this.previousFocus?.isConnected
      ? this.previousFocus
      : fallback;
    this.previousFocus = null;
    restore?.focus();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.container) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      this.onEscape();
      return;
    }
    if (event.key === "Tab") {
      this.wrapTab(event);
    }
  };

  private focusable(): HTMLElement[] {
    if (!this.container) {
      return [];
    }
    return Array.from(
      this.container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    );
  }

  private focusFirst(): void {
    const first = this.focusable()[0] ?? this.container;
    if (!first) {
      return;
    }
    if (first === this.container) {
      first.tabIndex = -1;
    }
    first.focus();
  }

  private wrapTab(event: KeyboardEvent): void {
    const focusable = this.focusable();
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!(first && last)) {
      return;
    }

    const active = this.root.activeElement;
    if (!active) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
      return;
    }
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }
    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private inertBackground(): void {
    for (const child of Array.from(document.body.children)) {
      if (
        child === this.host ||
        !(child instanceof HTMLElement) ||
        child.inert
      ) {
        continue;
      }
      child.inert = true;
      this.inerted.push(child);
    }
  }
}
