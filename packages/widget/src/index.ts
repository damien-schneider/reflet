import { RefletWidget } from "./widget";

declare global {
  interface Window {
    RefletWidget?: typeof RefletWidget;
    __refletWidgetInstance?: RefletWidget;
  }
}

function initWidget(): void {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script) {
    return;
  }

  const widgetId = script.getAttribute("data-widget-id");
  if (!widgetId) {
    console.error(
      "[Reflet Widget] Missing data-widget-id attribute on script tag"
    );
    return;
  }

  const widget = new RefletWidget(widgetId);
  window.__refletWidgetInstance = widget;
  widget.init();
}

window.RefletWidget = RefletWidget;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initWidget);
} else {
  initWidget();
}
