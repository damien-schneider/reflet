import { useCallback, useState } from "react";
import { isWidgetOwned } from "../../feedback/ui/floating/element-walk";

/** `display: contents` wrappers (common in component libraries) have no box of their own. */
export function renderedBox(element: Element): Element {
  let current = element;
  while (
    current.parentElement &&
    getComputedStyle(current).display === "contents"
  ) {
    current = current.parentElement;
  }
  return current;
}

/** The element a saved selector points at, as something that can be outlined or pinned. */
export function findOnPage(selector: string): Element | null {
  try {
    const element = document.querySelector(selector);
    return element && !isWidgetOwned(element) ? renderedBox(element) : null;
  } catch {
    return null;
  }
}

export function usePageHighlight() {
  const [highlighted, setHighlighted] = useState<Element | null>(null);
  const showSelector = useCallback((selector: string) => {
    const element = findOnPage(selector);
    setHighlighted(element);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    return element !== null;
  }, []);
  return {
    clearHighlight: () => setHighlighted(null),
    highlighted,
    showSelector,
  };
}
