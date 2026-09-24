// @vitest-environment node
import { describe, expect, it } from "vitest";
import { jsxElementLines } from "../source/jsx-range";

const lines = (...source: string[]) => source.join("\n");

describe("jsxElementLines", () => {
  it("spans a multi-line self-closing element with tricky props", () => {
    const code = lines(
      "return (",
      "  <Button",
      '    label="a > b"',
      "    onClick={() => a > b}",
      "    style={{ width: count < 3 ? 1 : 2 }}",
      "  />",
      ");"
    );
    expect(jsxElementLines(code, 2, 2)).toEqual({ end: 6, start: 2 });
  });

  it("balances nested elements that share the tag name", () => {
    const code = lines(
      "<div>",
      "  <div>",
      "    <div />",
      "  </div>",
      "  <p>Don't stop</p>",
      "</div>"
    );
    expect(jsxElementLines(code, 1, 0)).toEqual({ end: 6, start: 1 });
    expect(jsxElementLines(code, 2, 2)).toEqual({ end: 4, start: 2 });
  });

  it("skips JSX and apostrophes inside attribute expressions", () => {
    const code = lines(
      "<Suspense fallback={<p>Don't wait</p>}>",
      "  {items.map((item) => <Row key={item.id} />)}",
      "</Suspense>"
    );
    expect(jsxElementLines(code, 1, 0)).toEqual({ end: 3, start: 1 });
  });

  it("spans a fragment", () => {
    const code = lines("<>", "  <Header />", "  <Body />", "</>");
    expect(jsxElementLines(code, 1, 0)).toEqual({ end: 4, start: 1 });
  });

  it("reads member-expression tag names", () => {
    const code = lines("<Dialog.Root open>", "  <p />", "</Dialog.Root>");
    expect(jsxElementLines(code, 1, 0)).toEqual({ end: 3, start: 1 });
  });

  it("tolerates a column that points just past the angle bracket", () => {
    const code = lines("  <Card>", "    text", "  </Card>");
    expect(jsxElementLines(code, 1, 3)).toEqual({ end: 3, start: 1 });
    expect(jsxElementLines(code, 1, 0)).toEqual({ end: 3, start: 1 });
  });

  it("returns null when the line holds no element or the tag never closes", () => {
    expect(jsxElementLines("const total = a < b;", 1, 0)).toBeNull();
    expect(jsxElementLines("<div>\n  <span>\n</div>", 1, 0)).toBeNull();
    expect(jsxElementLines("<div />", 4, 0)).toBeNull();
  });
});
