import { describe, expect, it } from "vitest";
import type { Annotation } from "../../types";
import {
  arrowHead,
  isDegenerate,
  normalizeRect,
  simplifyPath,
  toWireAnnotations,
} from "../annotations";

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

describe("normalizeRect", () => {
  it("keeps a left-to-right drag as is", () => {
    expect(normalizeRect({ x: 5, y: 8 }, { x: 25, y: 38 })).toEqual({
      height: 30,
      width: 20,
      x: 5,
      y: 8,
    });
  });

  it("normalizes a drag made towards the top left", () => {
    expect(normalizeRect({ x: 25, y: 38 }, { x: 5, y: 8 })).toEqual({
      height: 30,
      width: 20,
      x: 5,
      y: 8,
    });
  });
});

describe("arrowHead", () => {
  it("returns two barbs at the arrow tip", () => {
    const [left, right] = arrowHead({ x: 0, y: 0 }, { x: 100, y: 0 }, 20);

    expect(Math.hypot(left.x - 100, left.y)).toBeCloseTo(20, 5);
    expect(Math.hypot(right.x - 100, right.y)).toBeCloseTo(20, 5);
    expect(left.y).toBeCloseTo(-right.y, 5);
    expect(left.x).toBeLessThan(100);
  });

  it("follows the arrow direction", () => {
    const [left] = arrowHead({ x: 0, y: 0 }, { x: 0, y: 100 }, 20);

    expect(left.y).toBeLessThan(100);
  });

  it("collapses to the tip for a zero length arrow", () => {
    expect(arrowHead({ x: 5, y: 5 }, { x: 5, y: 5 }, 20)).toEqual([
      { x: 5, y: 5 },
      { x: 5, y: 5 },
    ]);
  });
});

describe("simplifyPath", () => {
  it("drops points closer than the tolerance", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 30, y: 0 },
    ];

    expect(simplifyPath(points, 4)).toEqual([
      { x: 0, y: 0 },
      { x: 30, y: 0 },
    ]);
  });

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
  it("flags shapes smaller than a deliberate gesture", () => {
    expect(isDegenerate(annotation({ end: { x: 2, y: 2 } }))).toBe(true);
  });

  it("keeps shapes the user clearly drew", () => {
    expect(isDegenerate(annotation({ end: { x: 60, y: 40 } }))).toBe(false);
  });

  it("keeps a pen stroke with enough points", () => {
    const pen = annotation({
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 4 },
        { x: 2, y: 9 },
      ],
      tool: "pen",
    });

    expect(isDegenerate(pen)).toBe(false);
  });

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

  it("maps box shapes to a normalized rect", () => {
    const wire = toWireAnnotations([
      annotation({
        end: { x: 10, y: 20 },
        start: { x: 60, y: 70 },
        tool: "blur",
      }),
    ]);

    expect(wire).toEqual([
      {
        color: "#ef4444",
        height: 50,
        type: "blur",
        width: 50,
        x: 10,
        y: 20,
      },
    ]);
  });

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
