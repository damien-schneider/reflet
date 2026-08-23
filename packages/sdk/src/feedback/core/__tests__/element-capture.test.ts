import { describe, expect, it } from "vitest";
import { closeUpGeometry, contextRootFor } from "../element-capture";

interface Box {
  height: number;
  width: number;
  x: number;
  y: number;
}

function placeRect(element: Element, box: Box): void {
  element.getBoundingClientRect = () => ({
    bottom: box.y + box.height,
    height: box.height,
    left: box.x,
    right: box.x + box.width,
    toJSON: () => ({}),
    top: box.y,
    width: box.width,
    x: box.x,
    y: box.y,
  });
}

function render(html: string): void {
  document.body.innerHTML = html;
}

function query(selector: string): Element {
  const found = document.querySelector(selector);
  if (!found) {
    throw new Error(`No element for ${selector}`);
  }
  return found;
}

describe("contextRootFor", () => {
  it("walks up until an ancestor covers the element with breathing room", () => {
    render(
      '<div class="page"><div class="card"><button>Pick me</button></div></div>'
    );
    const button = query("button");
    const card = query(".card");
    const page = query(".page");

    placeRect(button, { height: 32, width: 120, x: 400, y: 300 });
    placeRect(card, { height: 90, width: 200, x: 360, y: 270 });
    placeRect(page, { height: 800, width: 1200, x: 0, y: 0 });

    expect(contextRootFor(button)).toBe(card);
  });

  it("keeps climbing when the closest ancestor is tighter than the padding", () => {
    render('<div class="row"><span class="chip">tiny</span></div>');
    const chip = query(".chip");
    const row = query(".row");

    placeRect(chip, { height: 20, width: 30, x: 500, y: 500 });
    placeRect(row, { height: 40, width: 60, x: 485, y: 490 });

    expect(contextRootFor(chip)).toBe(row);
  });

  it("caps runaway ancestors so a small control never captures a giant page", () => {
    render('<div class="huge" style="width:1px"></div>');
    const huge = query(".huge");
    const child = document.createElement("button");
    huge.appendChild(child);

    placeRect(child, { height: 20, width: 40, x: 100, y: 100 });
    placeRect(huge, { height: 9000, width: 2400, x: 0, y: 0 });

    expect(contextRootFor(child)).toBe(huge);
  });

  it("falls back to the tightest container when padding targets are unreachable", () => {
    render("<main><p>alone</p></main>");
    const paragraph = query("p");

    expect(contextRootFor(paragraph)).toBe(query("main"));
  });
});

describe("closeUpGeometry", () => {
  it("maps the picked element into capture pixels", () => {
    const zone = closeUpGeometry({
      capture: { height: 600, width: 1600 },
      elementRect: {
        bottom: 250,
        height: 80,
        left: 300,
        right: 500,
        toJSON: () => ({}),
        top: 170,
        width: 200,
        x: 300,
        y: 170,
      },
      rootRect: {
        bottom: 900,
        height: 800,
        left: 100,
        right: 900,
        toJSON: () => ({}),
        top: 100,
        width: 800,
        x: 100,
        y: 100,
      },
    });

    expect(zone).toEqual({ height: 160, scale: 2, width: 400, x: 400, y: 140 });
  });

  it("survives a zero-sized root without dividing by zero", () => {
    const zone = closeUpGeometry({
      capture: { height: 10, width: 10 },
      elementRect: {
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        toJSON: () => ({}),
        top: 0,
        width: 0,
        x: 0,
        y: 0,
      },
      rootRect: {
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        toJSON: () => ({}),
        top: 0,
        width: 0,
        x: 0,
        y: 0,
      },
    });

    expect(zone).toEqual({ height: 0, scale: 1, width: 0, x: 0, y: 0 });
  });
});
