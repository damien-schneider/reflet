import { describe, expect, it } from "vitest";
import { arrowOutline } from "../arrow-geometry";

describe("arrow outline", () => {
  it.each([2, 11, 100, 800, 5000])(
    "keeps a %i px arrow's head between its endpoints",
    (length) => {
      const { points, strokeWidth } = arrowOutline(
        { x: 0, y: 0 },
        { x: length, y: 0 }
      );
      expect(points).toContainEqual({ x: length, y: 0 });
      for (const point of points) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(length);
        expect(Number.isFinite(point.y)).toBe(true);
      }
      expect(strokeWidth).toBeGreaterThan(0);
      expect(strokeWidth).toBeLessThanOrEqual(length * 0.2);
    }
  );

  it("widens the tail into a shaft with a broader, symmetric head", () => {
    const length = 800;
    const { points } = arrowOutline({ x: 0, y: 0 }, { x: length, y: 0 });
    const tail = points.filter((point) => point.x === 0);
    const neck = points.filter((point) => point.x > 0 && point.x < length);
    const tailHalfWidth = Math.max(...tail.map((point) => Math.abs(point.y)));
    const shaftHalfWidth = Math.min(...neck.map((point) => Math.abs(point.y)));
    const headHalfWidth = Math.max(...neck.map((point) => Math.abs(point.y)));
    expect(shaftHalfWidth).toBeGreaterThan(tailHalfWidth * 3);
    expect(headHalfWidth).toBeGreaterThan(shaftHalfWidth * 2);
    for (const point of points) {
      expect(
        points.some((mirror) => mirror.x === point.x && mirror.y === -point.y)
      ).toBe(true);
    }
  });

  it.each([
    { x: 100, y: 0 },
    { x: -100, y: 0 },
    { x: 0, y: 100 },
    { x: 0, y: -100 },
    { x: 100, y: -100 },
  ])("rotates the complete silhouette toward $x, $y", (end) => {
    const length = Math.hypot(end.x, end.y);
    const { points } = arrowOutline({ x: 0, y: 0 }, end);
    expect(points).toContainEqual(end);
    for (const point of points) {
      const along = (point.x * end.x + point.y * end.y) / length;
      expect(along).toBeGreaterThanOrEqual(-0.000_001);
      expect(along).toBeLessThanOrEqual(length + 0.000_001);
    }
  });

  it("does not draw a head before the pointer moves", () => {
    expect(arrowOutline({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual({
      points: [],
      strokeWidth: 0,
    });
  });
});
