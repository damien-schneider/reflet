import type { ElementRect } from "../../types";
import type { Annotation, CapturedImage, Point } from "../types";
import { isDegenerate, normalizeRect } from "./annotations";
import { arrowOutline } from "./arrow-geometry";
import { capturedFromCanvas } from "./capture";

const STROKE_WIDTH = 3;
const HIGHLIGHT_ALPHA = 0.3;
const REDACTION_FILL = "#111827";
const PIXEL_BLOCK = 10;

export interface AnnotationCanvasContext {
  beginPath: () => void;
  canvas: { height: number; width: number };
  closePath: () => void;
  drawImage: (
    image: CanvasImageSource,
    dx: number,
    dy: number,
    dw: number,
    dh: number
  ) => void;
  fill: () => void;
  fillRect: (x: number, y: number, width: number, height: number) => void;
  fillStyle: string | CanvasGradient | CanvasPattern;
  fillText: (text: string, x: number, y: number) => void;
  font: string;
  globalAlpha: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  lineTo: (x: number, y: number) => void;
  lineWidth: number;
  moveTo: (x: number, y: number) => void;
  restore: () => void;
  save: () => void;
  stroke: () => void;
  strokeRect: (x: number, y: number, width: number, height: number) => void;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  textBaseline: CanvasTextBaseline;
}

function scalePoint(point: Point, scale: number): Point {
  return { x: point.x * scale, y: point.y * scale };
}

function scaleRect(rect: ElementRect, scale: number): ElementRect {
  return {
    height: rect.height * scale,
    width: rect.width * scale,
    x: rect.x * scale,
    y: rect.y * scale,
  };
}

function isCanvasElement(value: unknown): value is HTMLCanvasElement {
  return (
    typeof HTMLCanvasElement !== "undefined" &&
    value instanceof HTMLCanvasElement
  );
}

// Downsample before repainting so redacted pixels cannot be recovered.
function redact(context: AnnotationCanvasContext, rect: ElementRect): void {
  const source = context.canvas;
  const width = Math.max(1, Math.round(rect.width / PIXEL_BLOCK));
  const height = Math.max(1, Math.round(rect.height / PIXEL_BLOCK));

  if (isCanvasElement(source)) {
    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;
    const offscreenContext = offscreen.getContext("2d");

    if (offscreenContext) {
      offscreenContext.imageSmoothingEnabled = true;
      offscreenContext.drawImage(
        source,
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        0,
        0,
        width,
        height
      );
      context.drawImage(offscreen, rect.x, rect.y, rect.width, rect.height);
      return;
    }
  }

  context.fillStyle = REDACTION_FILL;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
}

function drawArrow(
  context: AnnotationCanvasContext,
  annotation: Annotation,
  scale: number
): void {
  const { points, strokeWidth } = arrowOutline(
    annotation.start,
    annotation.end
  );
  const [first, ...rest] = points.map((point) => scalePoint(point, scale));
  if (!first) {
    return;
  }

  context.beginPath();
  context.moveTo(first.x, first.y);
  for (const point of rest) {
    context.lineTo(point.x, point.y);
  }
  context.closePath();
  context.lineWidth = strokeWidth * scale;
  context.fill();
  context.stroke();
}

function drawPen(
  context: AnnotationCanvasContext,
  points: Point[],
  scale: number
): void {
  const [first, ...rest] = points;
  if (!first) {
    return;
  }

  const head = scalePoint(first, scale);
  context.beginPath();
  context.moveTo(head.x, head.y);
  for (const point of rest) {
    const scaled = scalePoint(point, scale);
    context.lineTo(scaled.x, scaled.y);
  }
  context.stroke();
}

function drawSpotlight(
  context: AnnotationCanvasContext,
  rect: ElementRect
): void {
  const { width, height } = context.canvas;
  context.save();
  context.fillStyle = REDACTION_FILL;
  context.globalAlpha = 0.55;
  context.fillRect(0, 0, width, rect.y);
  context.fillRect(
    0,
    rect.y + rect.height,
    width,
    height - rect.y - rect.height
  );
  context.fillRect(0, rect.y, rect.x, rect.height);
  context.fillRect(
    rect.x + rect.width,
    rect.y,
    width - rect.x - rect.width,
    rect.height
  );
  context.restore();
  context.strokeRect(rect.x, rect.y, rect.width, rect.height);
}

function drawAnnotation(
  context: AnnotationCanvasContext,
  annotation: Annotation,
  scale: number
): void {
  const { color, tool } = annotation;
  const rect = scaleRect(
    normalizeRect(annotation.start, annotation.end),
    scale
  );

  context.save();
  context.lineWidth = STROKE_WIDTH * scale;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = color;
  context.fillStyle = color;

  switch (tool) {
    case "text": {
      const lines = (annotation.text ?? "").split("\n");
      const lineHeight = rect.height / lines.length;
      context.font = `${lineHeight / 1.4}px ui-sans-serif, system-ui, sans-serif`;
      context.textBaseline = "top";
      for (const [index, line] of lines.entries()) {
        context.fillText(line, rect.x, rect.y + index * lineHeight);
      }
      break;
    }
    case "pen":
      drawPen(context, annotation.points ?? [], scale);
      break;
    case "arrow":
      drawArrow(context, annotation, scale);
      break;
    case "spotlight":
      drawSpotlight(context, rect);
      break;
    case "rectangle":
      context.strokeRect(rect.x, rect.y, rect.width, rect.height);
      break;
    case "highlight":
      context.globalAlpha = HIGHLIGHT_ALPHA;
      context.fillRect(rect.x, rect.y, rect.width, rect.height);
      break;
    default:
      redact(context, rect);
      break;
  }

  context.restore();
}

export function drawAnnotations(
  context: AnnotationCanvasContext,
  annotations: Annotation[],
  options?: { scale?: number }
): void {
  const scale = options?.scale ?? 1;
  for (const annotation of annotations) {
    if (!isDegenerate(annotation)) {
      drawAnnotation(context, annotation, scale);
    }
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Screenshot could not be decoded"));
    image.src = url;
  });
}

export async function renderAnnotatedImage(
  source: CapturedImage,
  annotations: Annotation[]
): Promise<CapturedImage | null> {
  if (annotations.length === 0) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  const image = await loadImage(source.objectUrl);
  context.drawImage(image, 0, 0, source.width, source.height);
  drawAnnotations(context, annotations);

  return await capturedFromCanvas(canvas, source.width);
}
