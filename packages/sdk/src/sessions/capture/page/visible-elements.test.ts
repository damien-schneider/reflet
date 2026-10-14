import { afterEach, describe, expect, it } from "vitest";
import { WIDGET_MARKER } from "../../../feedback/core/capture";
import { REDACT_ATTRIBUTE } from "../../../feedback/core/redact";
import { visibleElements } from "./visible-elements";

const ON_SCREEN = new DOMRect(10, 10, 120, 40);

function place<T extends Element>(element: T, rect = ON_SCREEN): T {
  element.getBoundingClientRect = () => rect;
  return element;
}

function button(name: string, rect = ON_SCREEN): HTMLButtonElement {
  const element = document.createElement("button");
  element.textContent = name;
  return place(element, rect);
}

const labels = (max = 10): string[] =>
  visibleElements({ includeSource: false, max }).map(({ label }) => label);

afterEach(() => {
  document.body.replaceChildren();
});

describe("visibleElements", () => {
  it("keeps only elements inside the viewport", () => {
    document.body.append(
      button("Save"),
      button(
        "Below the fold",
        new DOMRect(10, window.innerHeight + 50, 120, 40)
      ),
      button("Left of the page", new DOMRect(-300, 10, 120, 40)),
      button("Collapsed", new DOMRect(10, 10, 0, 0))
    );
    expect(labels()).toEqual(['button "Save"']);
  });

  it("skips the Reflet widget", () => {
    const host = document.createElement("div");
    host.setAttribute(WIDGET_MARKER, "");
    host.append(button("Send feedback"));
    document.body.append(host, button("Save"));
    expect(labels()).toEqual(['button "Save"']);
  });

  it("skips masked content and containers holding private text", () => {
    const masked = document.createElement("div");
    masked.setAttribute(REDACT_ATTRIBUTE, "");
    masked.append(button("Card 4242"));

    const holdsMasked = place(document.createElement("h2"));
    const secret = document.createElement("span");
    secret.setAttribute(REDACT_ATTRIBUTE, "");
    secret.textContent = "Account 1234";
    holdsMasked.append("Balance ", secret);

    const holdsEditable = place(document.createElement("label"));
    const editor = document.createElement("div");
    editor.setAttribute("contenteditable", "true");
    editor.textContent = "typed draft";
    holdsEditable.append(editor);

    const holdsTextarea = button("Reply");
    holdsTextarea.append(document.createElement("textarea"));

    document.body.append(
      masked,
      holdsMasked,
      holdsEditable,
      holdsTextarea,
      button("Save")
    );
    expect(labels()).toEqual(['button "Save"']);
  });

  it("skips what sits inside an editor, whose text the user typed", () => {
    const editor = document.createElement("div");
    editor.setAttribute("contenteditable", "true");
    const typedHeading = place(document.createElement("h2"));
    typedHeading.textContent = "Draft: salary review";
    editor.append(typedHeading);
    document.body.append(editor, button("Save"));
    expect(labels()).toEqual(['button "Save"']);
  });

  it("stops at the maximum in document order", () => {
    const heading = place(document.createElement("h1"));
    heading.textContent = "Billing";
    document.body.append(heading, button("Save"), button("Cancel"));
    expect(labels(2)).toEqual(['h1 "Billing"', 'button "Save"']);
  });
});
