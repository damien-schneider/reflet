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
    const wrappedFn = Object.assign(
      (...args: unknown[]) => {
        const command = args[0];
        if (typeof command === "string" && command.includes("changelog")) {
          return handleCommand(command, widget);
        }
        return originalFn(...args);
      },
      existingReflet,
      { _changelogWidget: widget }
    );
    window.Reflet = wrappedFn;
  } else {
    // No existing Reflet or it's a config object - create new function
    const refletFn = Object.assign(
      (...args: unknown[]) => {
        const command = args[0];
        if (typeof command === "string") {
          return handleCommand(command, widget);
        }
        return undefined;
      },
      { _changelogWidget: widget }
    );
    window.Reflet = refletFn;
  }
}

function isValidMode(
  value: string | null
): value is NonNullable<ChangelogWidgetConfig["mode"]> {
  return value === "card" || value === "popup" || value === "trigger";
}

function isValidPosition(
  value: string | null
): value is NonNullable<ChangelogWidgetConfig["position"]> {
  return value === "bottom-right" || value === "bottom-left";
}

function isValidTheme(
  value: string | null
): value is NonNullable<ChangelogWidgetConfig["theme"]> {
  return value === "light" || value === "dark" || value === "auto";
}

/**
 * Initialize the widget from global config or script data attributes
 */
function initWidget(): void {
  // Try global config object first
  const globalConfig = window.RefletChangelog;

  if (globalConfig?.publicKey) {
    const widget = new RefletChangelogWidget({
      ...globalConfig,
      publicKey: globalConfig.publicKey,
    });
    window.__refletChangelogWidgetInstance = widget;
    registerCommandApi(widget);
    widget.init();
    return;
  }

  // Try data attributes on the current script tag
  const script = document.currentScript;
  if (script) {
    const publicKey = script.getAttribute("data-public-key");
    if (publicKey) {
      const modeAttr = script.getAttribute("data-mode");
      const positionAttr = script.getAttribute("data-position");
      const themeAttr = script.getAttribute("data-theme");

      const config: ChangelogWidgetConfig = {
        publicKey,
        mode: isValidMode(modeAttr) ? modeAttr : "card",
        position: isValidPosition(positionAttr) ? positionAttr : "bottom-right",
        theme: isValidTheme(themeAttr) ? themeAttr : "light",
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
    "publicKey" in refletConfig
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
