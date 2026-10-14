import { isWidgetOwned } from "../../../feedback/ui/floating/element-walk";
import type { ElementRef } from "../../protocol";
import {
  describeElementRef,
  INTERACTIVE_SELECTOR,
  SESSION_MASK_SELECTORS,
} from "../element-ref";

const CANDIDATE_SELECTOR = [
  INTERACTIVE_SELECTOR,
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "img[alt]",
  "[role=img][aria-label]",
].join(", ");

const MASK_SELECTOR = SESSION_MASK_SELECTORS.join(", ");

const PRIVATE_CONTENT_SELECTOR = [
  MASK_SELECTOR,
  "[contenteditable]:not([contenteditable=false])",
  "textarea",
].join(", ");

function isOnScreen(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }
  const intersectsViewport =
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth;
  if (!intersectsViewport) {
    return false;
  }
  return typeof element.checkVisibility === "function"
    ? element.checkVisibility()
    : true;
}

export function visibleElements(options: {
  includeSource: boolean;
  max: number;
}): ElementRef[] {
  const recorded: ElementRef[] = [];
  if (options.max <= 0) {
    return recorded;
  }
  for (const element of document.body.querySelectorAll(CANDIDATE_SELECTOR)) {
    const shareable =
      !isWidgetOwned(element) &&
      element.closest(MASK_SELECTOR) === null &&
      !element.parentElement?.closest(PRIVATE_CONTENT_SELECTOR) &&
      element.querySelector(PRIVATE_CONTENT_SELECTOR) === null;
    if (shareable && isOnScreen(element)) {
      recorded.push(
        describeElementRef(element, { includeSource: options.includeSource })
      );
      if (recorded.length >= options.max) {
        break;
      }
    }
  }
  return recorded;
}
