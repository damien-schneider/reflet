import { RefletWidget } from "./widget";

declare global {
  interface Window {
    __refletWidgetInstance?: RefletWidget;
    RefletWidget?: typeof RefletWidget;
  }
}

const loaderScript = document.currentScript;

function initWidget(): void {
  if (!(loaderScript instanceof HTMLScriptElement)) {
    return;
  }

  const widgetId = loaderScript.getAttribute("data-widget-id");
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
