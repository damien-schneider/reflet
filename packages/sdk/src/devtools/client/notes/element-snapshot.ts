import {
  capturedFromCanvas,
  captureViewport,
  releaseCapture,
} from "../../../feedback/core/capture";
import type { CapturedImage } from "../../../feedback/types";
import { renderedBox } from "../find-on-page";

const CROP_PADDING = 32;
const MIN_CROP_SIZE = 160;
const SNAPSHOT_MAX_WIDTH = 800;
const OUTLINE_COLOR = "#4f46e5";
const OUTLINE_WIDTH = 2;

interface Box {
  height: number;
  width: number;
  x: number;
  y: number;
}

/** The element plus some room around it, grown to a readable minimum, kept inside the window. */
function cropAround(rect: DOMRect): Box {
  const grow = (start: number, length: number, limit: number) => {
    const padded = Math.max(length + CROP_PADDING * 2, MIN_CROP_SIZE);
    const from = Math.max(0, start + length / 2 - padded / 2);
    const to = Math.min(limit, from + padded);
    return { from: Math.max(0, to - padded), to };
  };
  const horizontal = grow(rect.left, rect.width, window.innerWidth);
  const vertical = grow(rect.top, rect.height, window.innerHeight);
  return {
    height: vertical.to - vertical.from,
    width: horizontal.to - horizontal.from,
    x: horizontal.from,
    y: vertical.from,
  };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("The page capture could not be read."));
    image.src = url;
  });
}

/**
 * Cropped from a render of the whole page rather than of the element's
 * subtree: an SVG shape or a styled child rendered on its own loses the
 * context that draws it and comes out blank.
 */
export async function captureElementSnapshot(
  element: Element
): Promise<CapturedImage | null> {
  const box = renderedBox(element);
  const page = await captureViewport();
  if (!page) {
    return null;
  }
  try {
    const rect = box.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return null;
    }
    const scale = page.width / window.innerWidth;
    const crop = cropAround(rect);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(crop.width * scale);
    canvas.height = Math.round(crop.height * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }
    context.drawImage(
      await loadImage(page.objectUrl),
      crop.x * scale,
      crop.y * scale,
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height
    );
    context.strokeStyle = OUTLINE_COLOR;
    context.lineWidth = OUTLINE_WIDTH * scale;
    context.strokeRect(
      (rect.left - crop.x) * scale,
      (rect.top - crop.y) * scale,
      rect.width * scale,
      rect.height * scale
    );
    return await capturedFromCanvas(canvas, SNAPSHOT_MAX_WIDTH);
  } finally {
    releaseCapture(page);
  }
}
