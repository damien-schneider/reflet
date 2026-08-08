/**
 * The picked element's markup leaves the reporter's browser and ends up in an
 * agent prompt, so it is scrubbed here: typed-in values, credentials and
 * anything marked `data-reflet-redact` never make the trip.
 */

const EMAIL = /[\w.%+-]+@[\w.-]+\.[a-z]{2,}/gi;
const LONG_TOKEN = /\b[\w-]{28,}\b/g;
const OPAQUE_URI = /^(?:data|blob|javascript):/i;
const WHITESPACE_RUN = /\s+/g;
const URL_QUERY = /[?#]/;

const REDACTED = "[redacted]";
const ELLIPSIS = "…";
export const REDACT_ATTRIBUTE = "data-reflet-redact";

const MAX_ATTRIBUTE_LENGTH = 120;
const MAX_TEXT_LENGTH = 200;
const MAX_CHILD_DEPTH = 3;
const MAX_CLONED_NODES = 400;

const DROPPED_TAGS = new Set(["script", "style", "noscript", "template"]);
const VALUE_HOLDERS = new Set(["input", "textarea", "select", "option"]);
const URL_ATTRIBUTES = new Set([
  "src",
  "srcset",
  "href",
  "poster",
  "action",
  "formaction",
]);

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}${ELLIPSIS}`;
}

/** Emails and token-shaped strings, wherever they appear in reported text. */
export function maskSecrets(value: string): string {
  return value.replace(EMAIL, REDACTED).replace(LONG_TOKEN, REDACTED);
}

function sanitizeUrl(value: string): string {
  if (OPAQUE_URI.test(value)) {
    return `${value.slice(0, value.indexOf(":"))}:${ELLIPSIS}`;
  }
  return value.split(URL_QUERY)[0] ?? value;
}

function sanitizeAttributes(element: Element): void {
  const holdsTypedValue = VALUE_HOLDERS.has(element.localName);

  for (const { name, value } of Array.from(element.attributes)) {
    if (holdsTypedValue && name === "value") {
      element.removeAttribute(name);
      continue;
    }

    const cleaned = URL_ATTRIBUTES.has(name)
      ? sanitizeUrl(value)
      : maskSecrets(value);
    element.setAttribute(name, truncate(cleaned, MAX_ATTRIBUTE_LENGTH));
  }
}

function collapse(element: Element): void {
  element.replaceChildren(element.ownerDocument.createTextNode(ELLIPSIS));
}

function sanitizeTree(element: Element, depth: number): void {
  sanitizeAttributes(element);

  if (element.hasAttribute(REDACT_ATTRIBUTE)) {
    element.replaceChildren(element.ownerDocument.createTextNode(REDACTED));
    return;
  }

  if (element.localName === "svg") {
    element.replaceChildren();
    return;
  }

  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.COMMENT_NODE) {
      child.remove();
      continue;
    }

    if (child.nodeType === Node.TEXT_NODE) {
      child.textContent = truncate(
        maskSecrets(child.textContent ?? ""),
        MAX_TEXT_LENGTH
      );
      continue;
    }

    if (!(child instanceof Element)) {
      continue;
    }

    if (DROPPED_TAGS.has(child.localName)) {
      child.remove();
      continue;
    }

    if (depth >= MAX_CHILD_DEPTH) {
      sanitizeAttributes(child);
      collapse(child);
      continue;
    }

    sanitizeTree(child, depth + 1);
  }
}

/** Redacted `outerHTML`, shallow-cloned when the subtree is too large to be useful. */
export function sanitizeMarkup(element: Element, maxLength: number): string {
  const isSmallEnough =
    element.querySelectorAll("*").length <= MAX_CLONED_NODES;
  const clone = element.cloneNode(isSmallEnough);
  if (!(clone instanceof Element)) {
    return "";
  }

  sanitizeTree(clone, 0);
  if (!isSmallEnough) {
    collapse(clone);
  }

  return truncate(clone.outerHTML.replace(WHITESPACE_RUN, " "), maxLength);
}
