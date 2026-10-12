import {
  buildSelector,
  describeElement,
  getElementRect,
} from "../../feedback/core/element-selector";
import { clip } from "../../feedback/core/page-context";
import { inspectReactElement } from "../../feedback/core/react-source";
import { REDACT_ATTRIBUTE, redactUrl } from "../../feedback/core/redact";
import type { ElementRef, Frame } from "../protocol";

export const SESSION_MASK_SELECTORS = [
  `[${REDACT_ATTRIBUTE}]`,
  "input[type=password]",
  "[autocomplete^=cc-]",
];

export const MAX_LABEL_CHARS = 160;
const MAX_SELECTOR_CHARS = 600;
const MAX_URL_CHARS = 2000;
const MAX_PAGE_TITLE_CHARS = 300;
const NAMING_ATTRIBUTES = ["aria-label", "placeholder", "title", "name"];

const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "label",
  "[contenteditable]:not([contenteditable=false])",
  "[role=button]",
  "[role=checkbox]",
  "[role=combobox]",
  "[role=link]",
  "[role=menuitem]",
  "[role=option]",
  "[role=radio]",
  "[role=switch]",
  "[role=tab]",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

const VALUE_HOLDER_SELECTOR =
  "input, textarea, select, [contenteditable]:not([contenteditable=false])";

const IMPLICIT_ROLES: Record<string, string> = {
  article: "article",
  aside: "complementary",
  button: "button",
  dialog: "dialog",
  footer: "contentinfo",
  form: "form",
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
  h5: "heading",
  h6: "heading",
  header: "banner",
  img: "img",
  li: "listitem",
  main: "main",
  nav: "navigation",
  ol: "list",
  option: "option",
  select: "combobox",
  summary: "button",
  table: "table",
  textarea: "textbox",
  ul: "list",
};

const INPUT_ROLES: Record<string, string> = {
  button: "button",
  checkbox: "checkbox",
  radio: "radio",
  range: "slider",
  reset: "button",
  search: "searchbox",
  submit: "button",
};

export function interactiveTarget(target: Element): Element {
  return target.closest(INTERACTIVE_SELECTOR) ?? target;
}

function elementRole(element: Element): string | null {
  const explicit = element.getAttribute("role");
  if (explicit) {
    return explicit;
  }
  if (element instanceof HTMLInputElement) {
    return INPUT_ROLES[element.type] ?? "textbox";
  }
  if (element instanceof HTMLAnchorElement) {
    return element.hasAttribute("href") ? "link" : null;
  }
  return IMPLICIT_ROLES[element.localName] ?? null;
}

/** Fields are named by their attributes only: their text is what the user typed. */
function elementLabel(element: Element): string {
  if (!element.matches(VALUE_HOLDER_SELECTOR)) {
    return clip(describeElement(element), MAX_LABEL_CHARS);
  }
  const name = NAMING_ATTRIBUTES.map((attribute) =>
    element.getAttribute(attribute)?.trim()
  ).find(Boolean);
  return clip(
    name ? `${element.localName} "${name}"` : element.localName,
    MAX_LABEL_CHARS
  );
}

export function describeElementRef(
  element: Element,
  options: { includeSource: boolean }
): ElementRef {
  const { componentStack, sourceLocation } = inspectReactElement(element);
  return {
    component: componentStack[0] ?? null,
    label: elementLabel(element),
    rect: getElementRect(element),
    role: elementRole(element),
    selector: clip(buildSelector(element), MAX_SELECTOR_CHARS),
    source: options.includeSource ? (sourceLocation ?? null) : null,
  };
}

export function captureFrame(): Frame {
  return {
    devicePixelRatio: window.devicePixelRatio,
    scrollX: Math.round(window.scrollX),
    scrollY: Math.round(window.scrollY),
    title: document.title ? clip(document.title, MAX_PAGE_TITLE_CHARS) : null,
    url: clip(redactUrl(window.location.href), MAX_URL_CHARS),
    viewportHeight: window.innerHeight,
    viewportWidth: window.innerWidth,
  };
}
