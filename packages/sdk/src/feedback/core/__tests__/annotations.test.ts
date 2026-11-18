import { describe, expect, it } from "vitest";
import type { Annotation } from "../../types";
import { isDegenerate, simplifyPath, toWireAnnotations } from "../annotations";

function annotation(overrides: Partial<Annotation>): Annotation {
  return {
    color: "#ef4444",
    end: { x: 10, y: 10 },
    id: "a1",
    start: { x: 0, y: 0 },
    tool: "rectangle",
    ...overrides,
  };
}

describe("simplifyPath", () => {
  it("always keeps the last point", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 41, y: 0 },
    ];

    expect(simplifyPath(points, 4).at(-1)).toEqual({ x: 41, y: 0 });
  });

  it("returns short paths untouched", () => {
    const points = [{ x: 1, y: 1 }];

    expect(simplifyPath(points, 4)).toEqual(points);
  });
});

describe("isDegenerate", () => {
  it("drops a pen stroke that is a single tap", () => {
    expect(
      isDegenerate(annotation({ points: [{ x: 0, y: 0 }], tool: "pen" }))
    ).toBe(true);
  });
});

describe("toWireAnnotations", () => {
  it("maps an arrow to its two endpoints", () => {
    const wire = toWireAnnotations([
      annotation({ end: { x: 80, y: 60 }, tool: "arrow" }),
    ]);

    expect(wire).toEqual([
      { color: "#ef4444", endX: 80, endY: 60, type: "arrow", x: 0, y: 0 },
    ]);
  });

  it.each(["rectangle", "spotlight", "highlight", "blur"] as const)(
    "maps %s to a normalized rect",
    (tool) => {
      const wire = toWireAnnotations([
        annotation({
          end: { x: 10, y: 20 },
          start: { x: 60, y: 70 },
          tool,
        }),
      ]);

      expect(wire).toEqual([
        {
          color: "#ef4444",
          height: 50,
          type: tool,
          width: 50,
          x: 10,
          y: 20,
        },
      ]);
    }
  );

  it("maps a pen stroke to its simplified path", () => {
    const wire = toWireAnnotations([
      annotation({
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 40, y: 0 },
        ],
        tool: "pen",
      }),
    ]);

    expect(wire[0]?.points).toEqual([
      { x: 0, y: 0 },
      { x: 40, y: 0 },
    ]);
  });

  it("skips degenerate shapes so a stray click never ships", () => {
    expect(toWireAnnotations([annotation({ end: { x: 1, y: 1 } })])).toEqual(
      []
    );
  });
});

it("serializes multiline text and its bounding box while dropping empty notes", () => {
  expect(
    toWireAnnotations([
      annotation({
        end: { x: 200, y: 64 },
        text: "Wrong amount\nPlease check",
        tool: "text",
      }),
      annotation({ text: "   ", tool: "text" }),
    ])
  ).toEqual([
    {
      color: "#ef4444",
      height: 64,
      text: "Wrong amount\nPlease check",
      type: "text",
      width: 200,
      x: 0,
      y: 0,
    },
  ]);
});
