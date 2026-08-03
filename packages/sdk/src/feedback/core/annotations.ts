import type { ElementRect, ScreenshotAnnotation } from "../../types";
import type { Annotation, AnnotationTool, Point } from "../types";

export const ANNOTATION_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#111827",
] as const;

const BOX_TOOLS: AnnotationTool[] = ["rectangle", "highlight", "blur"];
const MIN_GESTURE_LENGTH = 8;
const ARROW_HEAD_ANGLE = Math.PI / 7;
const DEFAULT_PATH_TOLERANCE = 2.5;

export function normalizeRect(start: Point, end: Point): ElementRect {
  return {
    height: Math.abs(end.y - start.y),
    width: Math.abs(end.x - start.x),
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
  };
}

/** The two barbs closing the arrow tip, both `size` px away from `end`. */
export function arrowHead(
  start: Point,
  end: Point,
  size: number
): [Point, Point] {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  if (Math.hypot(end.x - start.x, end.y - start.y) === 0) {
    return [end, end];
  }

  const barb = (offset: number): Point => ({
    x: end.x - size * Math.cos(angle + offset),
    y: end.y - size * Math.sin(angle + offset),
  });

  return [barb(-ARROW_HEAD_ANGLE), barb(ARROW_HEAD_ANGLE)];
}

/** Drops points a user cannot perceive, keeping the payload small. */
export function simplifyPath(
  points: Point[],
  tolerance = DEFAULT_PATH_TOLERANCE
): Point[] {
  if (points.length < 3) {
    return points;
  }

  const [first, ...rest] = points;
  if (!first) {
    return points;
  }

  const kept: Point[] = [first];
  let anchor = first;

  for (const point of rest.slice(0, -1)) {
    if (Math.hypot(point.x - anchor.x, point.y - anchor.y) >= tolerance) {
      kept.push(point);
      anchor = point;
    }
  }

  const last = points.at(-1);
  if (last) {
    kept.push(last);
  }

  return kept;
}

export function isDegenerate(annotation: Annotation): boolean {
  if (annotation.tool === "pen") {
    return (annotation.points?.length ?? 0) < 2;
  }

  const { start, end } = annotation;
  return Math.hypot(end.x - start.x, end.y - start.y) < MIN_GESTURE_LENGTH;
}

function toWire(annotation: Annotation): ScreenshotAnnotation {
  const { color, start, end, tool } = annotation;

  if (tool === "pen") {
    return {
      color,
      points: simplifyPath(annotation.points ?? []),
      type: tool,
      x: start.x,
      y: start.y,
    };
  }

  if (BOX_TOOLS.includes(tool)) {
    const rect = normalizeRect(start, end);
    return {
      color,
      height: rect.height,
      type: tool,
      width: rect.width,
      x: rect.x,
      y: rect.y,
    };
  }

  return {
    color,
    endX: end.x,
    endY: end.y,
    type: tool,
    x: start.x,
    y: start.y,
  };
}

/** Serializes to the shape the Reflet API stores next to the screenshot. */
export function toWireAnnotations(
  annotations: Annotation[]
): ScreenshotAnnotation[] {
  return annotations.filter((item) => !isDegenerate(item)).map(toWire);
}
