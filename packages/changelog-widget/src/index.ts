import type { ChangelogWidgetConfig } from "./types";
import { RefletChangelogWidget } from "./widget";

export type { ChangelogEntry, ChangelogWidgetConfig } from "./types";
// biome-ignore lint/performance/noBarrelFile: Widget needs clean export API
export { RefletChangelogWidget } from "./widget";

declare global {
  interface Window {
    RefletChangelogWidget?: typeof RefletChangelogWidget;
    RefletChangelog?: Partial<ChangelogWidgetConfig>;
    __refletChangelogWidgetInstance?: RefletChangelogWidget;
    Reflet?: ((...args: unknown[]) => unknown) &
      Partial<ChangelogWidgetConfig> & {
        _changelogWidget?: RefletChangelogWidget;
      };
  }
}

/**
 * Handle command-style API calls: window.Reflet('open_changelog')
 */
function handleCommand(
  command: string,
  widget: RefletChangelogWidget
): unknown {
  switch (command) {
    case "open_changelog":
      widget.open();
      return undefined;
    case "close_changelog":
      widget.close();
      return undefined;
    case "get_unread_changelog_count":
      return widget.getUnreadCount();
    case "mark_changelog_read":
      widget.markAsRead();
      return undefined;
    default:
      return undefined;
  }
}

/**
 * Register the command API on window.Reflet, extending it if it already exists
 */
function registerCommandApi(widget: RefletChangelogWidget): void {
  const existingReflet = window.Reflet;

  if (typeof existingReflet === "function") {
    // Feedback widget already registered a function-based Reflet
    // Wrap it to also handle changelog commands
    const originalFn = existingReflet;
    const wrappedFn = ((...args: unknown[]) => {
      const command = args[0];
      if (typeof command === "string" && command.includes("changelog")) {
        return handleCommand(command, widget);
      }
      return originalFn(...args);
    }) as typeof window.Reflet;

    // Preserve existing properties
    if (wrappedFn) {
      for (const key of Object.keys(existingReflet)) {
        // biome-ignore lint/suspicious/noExplicitAny: Dynamic property copying
        (wrappedFn as any)[key] = (existingReflet as any)[key];
      }
      wrappedFn._changelogWidget = widget;
      window.Reflet = wrappedFn;
    }
  } else {
    // No existing Reflet or it's a config object - create new function
    const refletFn = ((...args: unknown[]) => {
      const command = args[0];
      if (typeof command === "string") {
        return handleCommand(command, widget);
      }
      return undefined;
    }) as typeof window.Reflet;

    if (refletFn) {
      refletFn._changelogWidget = widget;
      window.Reflet = refletFn;
    }
  }
}

/**
 * Initialize the widget from global config or script data attributes
 */
function initWidget(): void {
  // Try global config object first
  const globalConfig = window.RefletChangelog;

  if (globalConfig?.publicKey) {
    const widget = new RefletChangelogWidget(
      globalConfig as ChangelogWidgetConfig
    );
    window.__refletChangelogWidgetInstance = widget;
    registerCommandApi(widget);
    widget.init();
    return;
  }

  // Try data attributes on the current script tag
  const script = document.currentScript as HTMLScriptElement | null;
  if (script) {
    const publicKey = script.getAttribute("data-public-key");
    if (publicKey) {
      const config: ChangelogWidgetConfig = {
        publicKey,
        mode:
          (script.getAttribute("data-mode") as ChangelogWidgetConfig["mode"]) ??
          "card",
        position:
          (script.getAttribute(
            "data-position"
          ) as ChangelogWidgetConfig["position"]) ?? "bottom-right",
        theme:
          (script.getAttribute(
            "data-theme"
          ) as ChangelogWidgetConfig["theme"]) ?? "light",
        primaryColor: script.getAttribute("data-color") ?? undefined,
        maxEntries: script.getAttribute("data-max-entries")
          ? Number(script.getAttribute("data-max-entries"))
          : undefined,
        triggerSelector:
          script.getAttribute("data-trigger-selector") ?? undefined,
        autoOpenForNew: script.getAttribute("data-auto-open") === "true",
      };

      const widget = new RefletChangelogWidget(config);
      window.__refletChangelogWidgetInstance = widget;
      registerCommandApi(widget);
      widget.init();
      return;
    }
  }

  // Check if window.Reflet has changelog config as a plain object
  const refletConfig = window.Reflet;
  if (
    refletConfig &&
    typeof refletConfig !== "function" &&
    (refletConfig as Partial<ChangelogWidgetConfig>).publicKey
  ) {
    // Don't auto-init from feedback widget's config - only from dedicated config
    return;
  }
}

// Expose the widget class globally
window.RefletChangelogWidget = RefletChangelogWidget;

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initWidget);
} else {
  initWidget();
}
