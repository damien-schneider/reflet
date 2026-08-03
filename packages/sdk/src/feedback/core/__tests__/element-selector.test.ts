import { beforeEach, describe, expect, it } from "vitest";
import {
  buildElementSelection,
  buildSelector,
  describeElement,
  getElementRect,
} from "../element-selector";

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

describe("buildSelector", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("uses a unique id when the id is a valid css identifier", () => {
    render('<div id="main"><span>hi</span></div>');

    expect(buildSelector(query("#main"))).toBe("#main");
  });

  it("ignores ids that are not safe css identifiers", () => {
    render('<div id="1234:radix"><span>hi</span></div>');

    expect(buildSelector(query("div"))).not.toContain("#1234");
  });

  it("prefers data-testid over a positional path", () => {
    render('<div><button data-testid="save-btn">Save</button></div>');

    expect(buildSelector(query("button"))).toBe('[data-testid="save-btn"]');
  });

  it("builds a positional path when no stable handle exists", () => {
    render("<section><ul><li>a</li><li>b</li></ul></section>");

    const selector = buildSelector(query("li:nth-of-type(2)"));

    expect(selector).toBe("body > section > ul > li:nth-of-type(2)");
    expect(document.querySelectorAll(selector)).toHaveLength(1);
  });

  it("omits nth-of-type when the tag is unique among siblings", () => {
    render("<section><ul><li>only</li></ul></section>");

    expect(buildSelector(query("li"))).toBe("body > section > ul > li");
  });

  it("anchors the path on the closest ancestor with a unique id", () => {
    render('<main id="app"><div><p>text</p></div></main>');

    expect(buildSelector(query("p"))).toBe("#app > div > p");
  });

  it("resolves the document element and body without a path", () => {
    expect(buildSelector(document.documentElement)).toBe("html");
    expect(buildSelector(document.body)).toBe("body");
  });

  it("always returns a selector that matches the original element", () => {
    render(
      '<div class="grid"><article><h2>One</h2></article><article><h2>Two</h2></article></div>'
    );
    const target = document.querySelectorAll("h2")[1];
    if (!target) {
      throw new Error("fixture missing");
    }

    expect(document.querySelector(buildSelector(target))).toBe(target);
  });
});

describe("describeElement", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("combines the tag name with the visible text", () => {
    render("<button>Sign in</button>");

    expect(describeElement(query("button"))).toBe('button "Sign in"');
  });

  it("prefers the accessible name over the text content", () => {
    render('<button aria-label="Close dialog">×</button>');

    expect(describeElement(query("button"))).toBe('button "Close dialog"');
  });

  it("falls back to the first class when there is no text", () => {
    render('<div class="card shadow"></div>');

    expect(describeElement(query("div"))).toBe("div.card");
  });

  it("truncates long labels", () => {
    render(`<p>${"word ".repeat(40)}</p>`);

    expect(describeElement(query("p")).length).toBeLessThanOrEqual(80);
  });
});

describe("buildElementSelection", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("bundles the selector, label, markup and rect", () => {
    render('<main id="app"><button class="primary">Save</button></main>');

    const selection = buildElementSelection(query("button"));

    expect(selection.selector).toBe("#app > button");
    expect(selection.label).toBe('button "Save"');
    expect(selection.html).toBe('<button class="primary">Save</button>');
    expect(selection.rect).toEqual({ height: 0, width: 0, x: 0, y: 0 });
    expect(selection.componentStack).toEqual([]);
    expect(selection.sourceLocation).toBeUndefined();
  });

  it("truncates oversized markup", () => {
    render(`<div data-note="${"x".repeat(2000)}"></div>`);

    expect(buildElementSelection(query("div")).html.length).toBeLessThanOrEqual(
      600
    );
  });
});

describe("getElementRect", () => {
  it("rounds the bounding box to whole pixels", () => {
    const element = document.createElement("div");
    element.getBoundingClientRect = () => ({
      bottom: 40.6,
      height: 20.4,
      left: 10.2,
      right: 40.9,
      toJSON: () => ({}),
      top: 20.2,
      width: 30.7,
      x: 10.2,
      y: 20.2,
    });

    expect(getElementRect(element)).toEqual({
      height: 20,
      width: 31,
      x: 10,
      y: 20,
    });
  });
});
