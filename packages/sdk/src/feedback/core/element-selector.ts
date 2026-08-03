import type { ElementRect, ElementSelection } from "../../types";
import { inspectReactElement } from "./react-source";

const SAFE_ID = /^[A-Za-z][\w-]*$/;
const WHITESPACE = /\s+/g;
const MAX_LABEL_LENGTH = 80;
const MAX_HTML_LENGTH = 600;
const MAX_DEPTH = 12;

function isUnique(selector: string): boolean {
  try {
    return document.querySelectorAll(selector).length === 1;
  } catch {
    return false;
  }
}

function escapeAttributeValue(value: string): string {
  return value.replace(/["\\]/g, "\\$&");
}

function uniqueHandle(element: Element): string | null {
  const id = element.getAttribute("id");
  if (id && SAFE_ID.test(id) && isUnique(`#${id}`)) {
    return `#${id}`;
  }

  const testId = element.getAttribute("data-testid");
  if (testId) {
    const selector = `[data-testid="${escapeAttributeValue(testId)}"]`;
    if (isUnique(selector)) {
      return selector;
    }
  }

  return null;
}

function positionalSegment(element: Element): string {
  const tag = element.localName;
  const parent = element.parentElement;
  if (!parent) {
    return tag;
  }

  const sameTag = Array.from(parent.children).filter(
    (child) => child.localName === tag
  );
  if (sameTag.length <= 1) {
    return tag;
  }

  return `${tag}:nth-of-type(${sameTag.indexOf(element) + 1})`;
}

/**
 * Shortest selector that still resolves back to `element` from the document.
 */
export function buildSelector(element: Element): string {
  if (element === document.documentElement) {
    return "html";
  }
  if (element === document.body) {
    return "body";
  }

  const handle = uniqueHandle(element);
  if (handle) {
    return handle;
  }

  const segments: string[] = [];
  let current: Element | null = element;
  let depth = 0;

  while (current && depth < MAX_DEPTH) {
    if (current === document.body) {
      segments.unshift("body");
      break;
    }
    if (current === document.documentElement) {
      segments.unshift("html");
      break;
    }

    const ancestorHandle = current === element ? null : uniqueHandle(current);
    if (ancestorHandle) {
      segments.unshift(ancestorHandle);
      break;
    }

    segments.unshift(positionalSegment(current));
    current = current.parentElement;
    depth++;
  }

  return segments.join(" > ");
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function accessibleLabel(element: Element): string {
  const explicit =
    element.getAttribute("aria-label") ??
    element.getAttribute("title") ??
    element.getAttribute("alt") ??
    element.getAttribute("placeholder");
  if (explicit?.trim()) {
    return explicit.trim();
  }

  return (element.textContent ?? "").replace(WHITESPACE, " ").trim();
}

/** Short human label such as `button "Sign in"` or `div.card`. */
export function describeElement(element: Element): string {
  const tag = element.localName;
  const label = accessibleLabel(element);
  if (label) {
    return truncate(`${tag} "${label}"`, MAX_LABEL_LENGTH);
  }

  const firstClass = element.classList.item(0);
  return firstClass ? `${tag}.${firstClass}` : tag;
}

export function getElementRect(element: Element): ElementRect {
  const rect = element.getBoundingClientRect();
  return {
    height: Math.round(rect.height),
    width: Math.round(rect.width),
    x: Math.round(rect.x),
    y: Math.round(rect.y),
  };
}

/** Everything an agent needs to find the picked element back in the codebase. */
export function buildElementSelection(element: Element): ElementSelection {
  const { componentStack, sourceLocation } = inspectReactElement(element);

  return {
    componentStack,
    html: truncate(element.outerHTML, MAX_HTML_LENGTH),
    label: describeElement(element),
    rect: getElementRect(element),
    selector: buildSelector(element),
    sourceLocation,
  };
}
