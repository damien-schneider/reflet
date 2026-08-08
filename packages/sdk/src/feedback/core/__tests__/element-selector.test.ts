import { beforeEach, describe, expect, it } from "vitest";
import {
  buildElementSelection,
  buildSelector,
  describeElement,
  describeRegion,
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

  it("prefers a form control name over a positional path", () => {
    render('<form><input name="email" type="email" /></form>');

    expect(buildSelector(query("input"))).toBe('input[name="email"]');
  });

  it("builds a positional path when no stable handle exists", () => {
    render("<section><ul><li>a</li><li>b</li></ul></section>");

    const selector = buildSelector(query("li:nth-of-type(2)"));

    expect(selector).toBe("ul > li:nth-of-type(2)");
    expect(document.querySelectorAll(selector)).toHaveLength(1);
  });

  it("stops growing the path as soon as it resolves uniquely", () => {
    render(
      "<div><div><div><section><ul><li>only</li></ul></section></div></div></div>"
    );

    expect(buildSelector(query("li"))).toBe("ul > li");
  });

  it("keeps a parent for context instead of returning a bare tag", () => {
    render('<main id="app"><div><p>text</p></div></main>');

    expect(buildSelector(query("p"))).toBe("div > p");
  });

  it("anchors the path on the closest ancestor with a unique handle", () => {
    render(
      '<main id="app"><div><p>one</p></div><div><p>two</p></div></main><section><div><p>three</p></div><div><p>four</p></div></section>'
    );

    expect(buildSelector(query("#app > div:nth-of-type(2) > p"))).toBe(
      "#app > div:nth-of-type(2) > p"
    );
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
    expect(selection.region).toBe("main");
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

  it("never reports what the user typed into a field", () => {
    render(
      '<form><input name="card" value="4242424242424242" /><input name="pass" type="password" value="hunter2" /></form>'
    );

    const { html } = buildElementSelection(query("form"));

    expect(html).not.toContain("4242424242424242");
    expect(html).not.toContain("hunter2");
    expect(html).toContain('name="card"');
  });

  it("masks contact details left in the markup", () => {
    render("<p>Contact ada@example.com about this</p>");

    expect(buildElementSelection(query("p")).html).not.toContain(
      "ada@example.com"
    );
  });

  it("drops the subtree of anything marked as private", () => {
    render("<div data-reflet-redact><span>salary: 92000</span></div>");

    expect(buildElementSelection(query("div")).html).not.toContain("92000");
  });
});

describe("describeRegion", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("names the landmark and the heading the element sits under", () => {
    render(
      '<main aria-label="Settings"><h2>Danger zone</h2><button>Delete</button></main>'
    );

    expect(describeRegion(query("button"))).toBe(
      'main "Settings" › Danger zone'
    );
  });

  it("returns nothing when the page offers no landmark or heading", () => {
    render("<button>Delete</button>");

    expect(describeRegion(query("button"))).toBeUndefined();
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
