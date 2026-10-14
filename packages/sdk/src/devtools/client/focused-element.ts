export function focusedElementAround(node: Node): Element | null {
  const scope = node.getRootNode();
  return scope instanceof ShadowRoot || scope instanceof Document
    ? scope.activeElement
    : null;
}
