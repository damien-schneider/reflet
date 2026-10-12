const VALUE_IS_PAGE_CONTENT: Record<string, boolean> = {
  button: true,
  checkbox: true,
  color: true,
  file: true,
  hidden: true,
  image: true,
  radio: true,
  range: true,
  reset: true,
  submit: true,
};

export function blankFieldValues(root: Element): void {
  for (const input of root.querySelectorAll("input")) {
    if (!VALUE_IS_PAGE_CONTENT[input.type]) {
      input.value = "";
      input.removeAttribute("value");
    }
  }
  for (const textarea of root.querySelectorAll("textarea")) {
    textarea.value = "";
    textarea.textContent = "";
  }
  for (const select of root.querySelectorAll("select")) {
    select.replaceChildren();
  }
}
