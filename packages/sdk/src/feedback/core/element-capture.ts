import type { ElementSelection } from "../../types";
import type { Annotation, CapturedImage } from "../types";
import { capturedFromCanvas, captureViewport, releaseCapture } from "./capture";

const MIN_CONTEXT_PADDING = 24;
const MAX_CONTEXT_WIDTH = 2000;
const CLOSE_UP_MAX_WIDTH = 1200;
const SELECTION_COLOR = "#4f46e5";
const OUTLINE_COLOR = "#4f46e5";
const OUTLINE_GLOW = "#ffffff";
const OUTLINE_WIDTH = 3;
const GLOW_WIDTH = 6;
const DIM_OVERLAY = "rgba(15, 23, 42, 0.45)";

/**
 * Tightest ancestor that keeps some breathing room around the pick — the zoom
 * stays zoomed instead of growing to a giant section. Only when nothing up
 * the tree clears the minimum does the widest candidate below the cap win.
 */
export function contextRootFor(element: Element): Element {
  const target = element.getBoundingClientRect();
  const coversAtLeast = (box: DOMRect, margin: number): boolean =>
    box.left <= target.left - margin &&
    box.right >= target.right + margin &&
    box.top <= target.top - margin &&
    box.bottom >= target.bottom + margin;

  let tightest: Element | null = null;
  let current = element.parentElement;

  while (current && current !== document.documentElement) {
    const box = current.getBoundingClientRect();

    if (coversAtLeast(box, MIN_CONTEXT_PADDING)) {
      return current;
    }
    tightest ??= box.width < MAX_CONTEXT_WIDTH ? current : null;

    current = current.parentElement;
  }

  return tightest ?? element;
}

export interface CloseUpGeometry {
  height: number;
  scale: number;
  width: number;
  x: number;
  y: number;
}

/** Where the picked element sits inside the context shot, in image pixels. */
export function closeUpGeometry(params: {
  capture: Pick<CapturedImage, "height" | "width">;
  elementRect: DOMRect;
  rootRect: DOMRect;
}): CloseUpGeometry {
  const scale =
    params.rootRect.width > 0
      ? params.capture.width / params.rootRect.width
      : 1;

  return {
    height: Math.round(params.elementRect.height * scale),
    scale,
    width: Math.round(params.elementRect.width * scale),
    x: Math.round((params.elementRect.left - params.rootRect.left) * scale),
    y: Math.round((params.elementRect.top - params.rootRect.top) * scale),
  };
}

/** Rectangle annotation marking the picked element on the viewport shot. */
export function highlightFor(
  selection: ElementSelection,
  capture: CapturedImage
): Annotation {
  const scale = capture.width / window.innerWidth;
  const { rect } = selection;

  return {
    color: SELECTION_COLOR,
    end: {
      x: (rect.x + rect.width) * scale,
      y: (rect.y + rect.height) * scale,
    },
    id: `selection-${rect.x}-${rect.y}`,
    start: { x: rect.x * scale, y: rect.y * scale },
    tool: "rectangle",
  };
}

function drawZoneOverlay(
  context: CanvasRenderingContext2D,
  zone: CloseUpGeometry
): void {
  context.save();
  context.fillStyle = DIM_OVERLAY;
  context.beginPath();
  context.rect(0, 0, context.canvas.width, context.canvas.height);
  context.rect(zone.x, zone.y, zone.width, zone.height);
  context.fill("evenodd");

  for (const [color, width] of [
    [OUTLINE_GLOW, GLOW_WIDTH],
    [OUTLINE_COLOR, OUTLINE_WIDTH],
  ] as const) {
    context.strokeStyle = color;
    context.lineWidth = width * zone.scale;
    context.strokeRect(zone.x, zone.y, zone.width, zone.height);
  }
  context.restore();
}

function drawCloseUp(
  capture: CapturedImage,
  zone: CloseUpGeometry
): Promise<CapturedImage | null> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = capture.width;
    canvas.height = capture.height;
    const context = canvas.getContext("2d");
    const image = new Image();

    image.onload = () => {
      if (!context) {
        resolve(null);
        return;
      }
      context.drawImage(image, 0, 0, capture.width, capture.height);
      drawZoneOverlay(context, zone);
      resolve(capturedFromCanvas(canvas, CLOSE_UP_MAX_WIDTH));
    };
    image.onerror = () => resolve(null);
    image.src = capture.objectUrl;
  });
}

/**
 * Zoomed view of the picked zone: the surrounding area captured for context,
 * everything outside the selection dimmed and the zone framed with a glowing
 * outline — unambiguous to eyes and vision models alike.
 * Falls back to the plain context shot when the overlay cannot be drawn.
 */
export async function captureElementCloseUp(
  element: Element
): Promise<CapturedImage | null> {
  try {
    const root = contextRootFor(element);
    const rootRect = root.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const capture = await captureViewport({
      element: root,
      maxWidth: CLOSE_UP_MAX_WIDTH,
    });
    if (!capture || root === element) {
      return capture;
    }

    const zone = closeUpGeometry({ capture, elementRect, rootRect });
    const outlined = await drawCloseUp(capture, zone);

    if (outlined) {
      releaseCapture(capture);
      return outlined;
    }
    return capture;
  } catch {
    return null;
  }
}
