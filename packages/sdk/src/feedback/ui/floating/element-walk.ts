import { WIDGET_MARKER } from "../../core/capture";

type SiblingDirection = "nextElementSibling" | "previousElementSibling";

const ARROW_SIBLING: Record<string, SiblingDirection> = {
  ArrowLeft: "previousElementSibling",
  ArrowRight: "nextElementSibling",
};

export const AIM_KEYS = [
  "Tab",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
];

export function isWidgetOwned(element: Element): boolean {
  return element.closest(`[${WIDGET_MARKER}]`) !== null;
}

function isPickable(element: Element | null): boolean {
  if (
    !element ||
    element === document.documentElement ||
    isWidgetOwned(element)
  ) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function pickableElements(): Element[] {
  return Array.from(document.body.querySelectorAll("*")).filter(isPickable);
}

function documentStep(from: Element, backwards: boolean): Element | null {
  const all = pickableElements();
  const index = all.indexOf(from);
  if (all.length === 0) {
    return null;
  }
  if (index === -1) {
    return all[0] ?? null;
  }
  return all[(index + (backwards ? -1 : 1) + all.length) % all.length] ?? null;
}

function climb(from: Element): Element | null {
  let candidate = from.parentElement;
  while (candidate && !isPickable(candidate)) {
    candidate = candidate.parentElement;
  }
  return candidate;
}

function descend(from: Element): Element | null {
  let candidate = from.firstElementChild;
  while (candidate && !isPickable(candidate)) {
    candidate = candidate.nextElementSibling;
  }
  return candidate;
}

function sibling(from: Element, direction: SiblingDirection): Element | null {
  let candidate = from[direction];
  while (candidate && !isPickable(candidate)) {
    candidate = candidate[direction];
  }
  return candidate;
}

export function stepAim(
  from: Element | null,
  key: string,
  backwards: boolean
): Element | null {
  if (!(from && isPickable(from))) {
    return pickableElements()[0] ?? null;
  }
  if (key === "Tab") {
    return documentStep(from, backwards);
  }
  if (key === "ArrowUp") {
    return climb(from);
  }
  if (key === "ArrowDown") {
    return descend(from);
  }
  const direction = ARROW_SIBLING[key];
  return direction ? sibling(from, direction) : null;
}
