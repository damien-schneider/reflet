import { expect, it } from "vitest";
import { nearestBoxedElement } from "./element-walk";

it("aims at the link when the pointer is over text wrapped in a display: contents span", () => {
  document.body.innerHTML = `<a href="/start"><span style="display: contents">Start for free</span></a>`;

  expect(nearestBoxedElement(document.querySelector("span"))).toBe(
    document.querySelector("a")
  );
});

it("climbs through nested display: contents wrappers", () => {
  document.body.innerHTML = `<nav><div style="display: contents"><span style="display: contents">Pricing</span></div></nav>`;

  expect(nearestBoxedElement(document.querySelector("span"))).toBe(
    document.querySelector("nav")
  );
});

it("keeps an element that draws its own box", () => {
  document.body.innerHTML = "<button><span>Save</span></button>";

  expect(nearestBoxedElement(document.querySelector("span"))).toBe(
    document.querySelector("span")
  );
});
