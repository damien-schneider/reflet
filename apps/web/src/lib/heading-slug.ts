import { Children, isValidElement, type ReactNode } from "react";

const NON_SLUG_CHARS = /[^a-z0-9\s-]/g;
const WHITESPACE = /\s+/g;

function textContent(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textContent(node.props.children);
  }
  return Children.toArray(node).map(textContent).join("");
}

export function headingSlug(children: ReactNode): string {
  return textContent(children)
    .toLowerCase()
    .replace(NON_SLUG_CHARS, "")
    .trim()
    .replace(WHITESPACE, "-");
}
