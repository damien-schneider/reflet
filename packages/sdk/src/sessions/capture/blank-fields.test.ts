import { expect, it } from "vitest";
import { blankFieldValues } from "./blank-fields";

function cloneOf(html: string): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = html;
  return root;
}

it("empties what was typed into text fields and keeps their placeholder", () => {
  const root = cloneOf(
    `<input value="4111 1111" placeholder="Card number"><textarea>my address</textarea>`
  );
  const input = root.querySelector("input");
  if (input) {
    input.value = "typed later";
  }

  blankFieldValues(root);

  expect(root.querySelector("input")?.value).toBe("");
  expect(root.querySelector("input")?.hasAttribute("value")).toBe(false);
  expect(root.querySelector("input")?.placeholder).toBe("Card number");
  expect(root.querySelector("textarea")?.value).toBe("");
  expect(root.innerHTML).not.toContain("my address");
});

it("leaves no chosen option in a select", () => {
  const root = cloneOf(
    "<select><option>France</option><option selected>Japan</option></select>"
  );

  blankFieldValues(root);

  expect(root.innerHTML).not.toContain("Japan");
});

it("keeps button labels and checkbox states, which are part of the page", () => {
  const root = cloneOf(
    `<input type="submit" value="Pay now"><input type="checkbox" checked>`
  );

  blankFieldValues(root);

  expect(root.querySelector("[type=submit]")?.getAttribute("value")).toBe(
    "Pay now"
  );
  expect(root.querySelector("[type=checkbox]")?.hasAttribute("checked")).toBe(
    true
  );
});
