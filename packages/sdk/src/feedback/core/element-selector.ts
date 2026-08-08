import type { ElementRect, ElementSelection } from "../../types";
import { inspectReactElement } from "./react-source";
import { maskSecrets, sanitizeMarkup } from "./redact";

const SAFE_ID = /^[A-Za-z][\w-]*$/;
const WHITESPACE = /\s+/g;
const MAX_LABEL_LENGTH = 80;
const MAX_HTML_LENGTH = 600;
const MAX_REGION_LENGTH = 160;
const MAX_HANDLE_VALUE_LENGTH = 80;
const MAX_DEPTH = 12;
const MIN_PATH_SEGMENTS = 2;
// Hard caps enforced by POST /api/v1/feedback/create — over them the whole
// report is rejected, so clip here rather than lose the submission.
const MAX_SELECTOR_LENGTH = 600;
const MAX_SOURCE_LOCATION_LENGTH = 400;

const TEST_ATTRIBUTES = [
  "data-testid",
  "data-test-id",
  "data-test",
  "data-cy",
  "data-qa",
];
const NAMING_ATTRIBUTES = ["name", "aria-label"];

const LANDMARK_SELECTOR =
  'dialog, [role="dialog"], [role="alertdialog"], main, nav, aside, header, footer, form, section, article';
const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6, [role="heading"]';

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

function attributeHandle(
  element: Element,
  attribute: string,
  qualifier: string
): string | null {
  const value = element.getAttribute(attribute);
  if (!value || value.length > MAX_HANDLE_VALUE_LENGTH) {
    return null;
  }

  const selector = `${qualifier}[${attribute}="${escapeAttributeValue(value)}"]`;
  return isUnique(selector) ? selector : null;
}

/** Something an engineer would have written on purpose, unlike a positional path. */
function uniqueHandle(element: Element): string | null {
  const id = element.getAttribute("id");
  if (id && SAFE_ID.test(id) && isUnique(`#${id}`)) {
    return `#${id}`;
  }

  for (const attribute of TEST_ATTRIBUTES) {
    const handle = attributeHandle(element, attribute, "");
    if (handle) {
      return handle;
    }
  }

  for (const attribute of NAMING_ATTRIBUTES) {
    const handle = attributeHandle(element, attribute, element.localName);
    if (handle) {
      return handle;
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
 * Grows the path one ancestor at a time and stops as soon as it is unique, so
 * a stable handle anywhere up the tree replaces the whole positional chain.
 * A bare tag is never enough: positional paths keep a parent for context.
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

  for (let depth = 0; current && depth < MAX_DEPTH; depth++) {
    const ancestorHandle = current === element ? null : uniqueHandle(current);
    segments.unshift(ancestorHandle ?? positionalSegment(current));

    const candidate = segments.join(" > ");
    const isAnchored = segments.length >= MIN_PATH_SEGMENTS;
    if (
      ancestorHandle ||
      current === document.body ||
      (isAnchored && isUnique(candidate))
    ) {
      return candidate;
    }

    current = current.parentElement;
  }

  return segments.join(" > ");
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function collapseText(value: string): string {
  return value.replace(WHITESPACE, " ").trim();
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

  return collapseText(element.textContent ?? "");
}

/** Short human label such as `button "Sign in"` or `div.card`. */
export function describeElement(element: Element): string {
  const tag = element.localName;
  const label = maskSecrets(accessibleLabel(element));
  if (label) {
    return truncate(`${tag} "${label}"`, MAX_LABEL_LENGTH);
  }

  const firstClass = element.classList.item(0);
  return truncate(firstClass ? `${tag}.${firstClass}` : tag, MAX_LABEL_LENGTH);
}

function describeLandmark(element: Element): string | null {
  const landmark = element.parentElement?.closest(LANDMARK_SELECTOR);
  if (!landmark) {
    return null;
  }

  const name =
    landmark.getAttribute("aria-label") ?? landmark.getAttribute("title");
  return name?.trim()
    ? `${landmark.localName} "${collapseText(name)}"`
    : landmark.localName;
}

function headingAbove(element: Element): string | null {
  let closest: Element | null = null;

  for (const heading of document.querySelectorAll(HEADING_SELECTOR)) {
    const position = heading.compareDocumentPosition(element);
    // biome-ignore lint/suspicious/noBitwiseOperators: compareDocumentPosition returns a bitmask
    if ((position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0) {
      closest = heading;
    }
  }

  const text = collapseText(closest?.textContent ?? "");
  return text || null;
}

/**
 * Where the element sits from a reader's point of view — `dialog "Members" ›
 * Danger zone` says more to an agent than any DOM path can.
 */
export function describeRegion(element: Element): string | undefined {
  const landmark = describeLandmark(element);
  const heading = headingAbove(element);
  const parts = [landmark];

  if (heading && !landmark?.includes(`"${heading}"`)) {
    parts.push(heading);
  }

  const region = parts.filter((part) => part !== null).join(" › ");
  return region ? truncate(maskSecrets(region), MAX_REGION_LENGTH) : undefined;
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
    html: sanitizeMarkup(element, MAX_HTML_LENGTH),
    label: describeElement(element),
    rect: getElementRect(element),
    region: describeRegion(element),
    selector: truncate(buildSelector(element), MAX_SELECTOR_LENGTH),
    sourceLocation: sourceLocation
      ? truncate(sourceLocation, MAX_SOURCE_LOCATION_LENGTH)
      : sourceLocation,
  };
}
