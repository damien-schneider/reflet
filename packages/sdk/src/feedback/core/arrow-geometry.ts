import type { Point } from "../types";

export function arrowOutline(
  start: Point,
  end: Point
): {
  points: Point[];
  strokeWidth: number;
} {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) {
    return { points: [], strokeWidth: 0 };
  }

  const shaftWidth = Math.min(20, Math.max(6, length * 0.025), length * 0.2);
  const headLength = Math.min(length * 0.45, shaftWidth * 3);
  const headHalfWidth = headLength * 0.55;
  const shaftLength = length - headLength;
  const pointOnArrow = (along: number, across: number): Point => ({
    x: start.x + (dx * along - dy * across) / length,
    y: start.y + (dy * along + dx * across) / length,
  });

  return {
    points: [
      pointOnArrow(0, 0),
      pointOnArrow(shaftLength, -shaftWidth / 2),
      pointOnArrow(shaftLength, -headHalfWidth),
      { x: end.x, y: end.y },
      pointOnArrow(shaftLength, headHalfWidth),
      pointOnArrow(shaftLength, shaftWidth / 2),
    ],
    strokeWidth: Math.min(4, length * 0.02),
  };
}
