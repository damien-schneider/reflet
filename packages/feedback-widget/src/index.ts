import type { WidgetConfig } from "./types";
import { RefletFeedbackWidget } from "./widget";

export type { WidgetConfig } from "./types";
// Re-export for consumers
// biome-ignore lint/performance/noBarrelFile: Widget needs clean export API
export { RefletFeedbackWidget } from "./widget";

declare global {
  interface Window {
    RefletFeedbackWidget?: typeof RefletFeedbackWidget;
    Reflet?: Partial<WidgetConfig>;
    RefletFeedbackConfig?: Partial<WidgetConfig>;
    __refletFeedbackWidgetInstance?: RefletFeedbackWidget;
  }
}

/**
 * Initialize the widget from global config
 */
function initWidget(): void {
  // Try to get config from global window.Reflet or window.RefletFeedbackConfig
  const config = window.Reflet ?? window.RefletFeedbackConfig;

  if (!config?.publicKey) {
    // Also try data attributes on script tag
    const script = document.currentScript as HTMLScriptElement | null;
    if (script) {
      const publicKey = script.getAttribute("data-public-key");
      if (publicKey) {
        const widgetConfig: WidgetConfig = {
          publicKey,
          mode:
            (script.getAttribute("data-mode") as WidgetConfig["mode"]) ??
            "floating",
          position:
            (script.getAttribute(
              "data-position"
            ) as WidgetConfig["position"]) ?? "bottom-right",
          theme:
            (script.getAttribute("data-theme") as WidgetConfig["theme"]) ??
            "light",
          primaryColor: script.getAttribute("data-color") ?? undefined,
        };

        const widget = new RefletFeedbackWidget(widgetConfig);
        window.__refletFeedbackWidgetInstance = widget;
        widget.init();
        return;
      }
    }

    console.error(
      "[Reflet Feedback Widget] Missing publicKey in config. Usage:"
    );
    console.error(`
      window.Reflet = {
        publicKey: 'fb_pub_xxx',
        user: { id: 'user_123', email: 'user@example.com', name: 'John' }
      };
    `);
    return;
  }

  // Create widget with config
  const widgetConfig: WidgetConfig = {
    publicKey: config.publicKey,
    mode: config.mode ?? "floating",
    position: config.position ?? "bottom-right",
    theme: config.theme ?? "light",
    primaryColor: config.primaryColor,
    locale: config.locale,
    loginUrl: config.loginUrl,
    targetId: config.targetId,
    features: config.features,
    user: config.user,
    userToken: config.userToken,
    onFeedbackCreated: config.onFeedbackCreated,
    onVote: config.onVote,
    onOpen: config.onOpen,
    onClose: config.onClose,
  };

  const widget = new RefletFeedbackWidget(widgetConfig);
  window.__refletFeedbackWidgetInstance = widget;
  widget.init();
}

// Expose the widget class globally
window.RefletFeedbackWidget = RefletFeedbackWidget;

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initWidget);
} else {
  initWidget();
}
