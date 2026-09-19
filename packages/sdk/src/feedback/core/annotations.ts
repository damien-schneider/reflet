import type { ElementRect, ScreenshotAnnotation } from "../../types";
import type { Annotation, AnnotationTool, Point } from "../types";

const BOX_TOOLS: AnnotationTool[] = [
  "text",
  "rectangle",
  "spotlight",
  "highlight",
  "blur",
];
const MIN_GESTURE_LENGTH = 8;
const DEFAULT_PATH_TOLERANCE = 2.5;

export function normalizeRect(start: Point, end: Point): ElementRect {
  return {
    height: Math.abs(end.y - start.y),
    width: Math.abs(end.x - start.x),
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
  };
}

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
  if (annotation.tool === "text") {
    return !annotation.text?.trim();
  }
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
      ...(tool === "text" ? { text: annotation.text } : {}),
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

export function toWireAnnotations(
  annotations: Annotation[]
): ScreenshotAnnotation[] {
  return annotations.filter((item) => !isDegenerate(item)).map(toWire);
}
