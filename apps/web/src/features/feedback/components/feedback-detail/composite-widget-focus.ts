const TEXT_ENTRY_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

const ARROW_OWNING_ROLES = new Set([
  "combobox",
  "grid",
  "listbox",
  "menu",
  "menubar",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "radiogroup",
  "searchbox",
  "slider",
  "spinbutton",
  "tab",
  "tablist",
  "textbox",
  "tree",
  "treeitem",
]);

const ARROW_OWNING_CONTAINERS = [
  '[role="menu"]',
  '[role="menubar"]',
  '[role="listbox"]',
  '[role="grid"]',
  '[role="tree"]',
  '[role="tablist"]',
  '[role="radiogroup"]',
].join(",");

export function isCompositeWidgetFocused(): boolean {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) {
    return false;
  }
  if (TEXT_ENTRY_TAGS.has(active.tagName) || active.isContentEditable) {
    return true;
  }
  const role = active.getAttribute("role");
  if (role && ARROW_OWNING_ROLES.has(role)) {
    return true;
  }
  return active.closest(ARROW_OWNING_CONTAINERS) !== null;
}
