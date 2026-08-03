import type { CapturedImage } from "../types";

/** Marks every node the widget owns, so captures never include the panel. */
export const WIDGET_MARKER = "data-reflet-widget";

const MAX_PIXEL_RATIO = 2;
const DEFAULT_MAX_WIDTH = 2400;

export interface CaptureOptions {
  /** Capture this element instead of the visible viewport. */
  element?: Element;
  excludeSelectors?: string[];
  maxWidth?: number;
}

interface SnapdomOptions {
  cache: "disabled";
  clip?: "viewport";
  dpr: number;
  embedFonts: boolean;
  exclude: string[];
  fast: boolean;
}

export function buildSnapdomOptions(options: {
  devicePixelRatio?: number;
  element?: Element;
  excludeSelectors?: string[];
}): SnapdomOptions {
  const ratio = options.devicePixelRatio ?? 1;

  return {
    cache: "disabled",
    clip: options.element ? undefined : "viewport",
    dpr: Math.min(Math.max(ratio || 1, 1), MAX_PIXEL_RATIO),
    embedFonts: true,
    exclude: [`[${WIDGET_MARKER}]`, ...(options.excludeSelectors ?? [])],
    fast: true,
  };
}

export function fitWithin(
  size: { height: number; width: number },
  maxWidth: number
): { height: number; scale: number; width: number } {
  if (size.width <= maxWidth) {
    return { height: size.height, scale: 1, width: size.width };
  }

  const scale = maxWidth / size.width;
  return {
    height: Math.max(1, Math.round(size.height * scale)),
    scale,
    width: maxWidth,
  };
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
}

function downscale(
  canvas: HTMLCanvasElement,
  target: { height: number; width: number }
): HTMLCanvasElement {
  const resized = document.createElement("canvas");
  resized.width = target.width;
  resized.height = target.height;

  const context = resized.getContext("2d");
  if (!context) {
    return canvas;
  }

  context.imageSmoothingQuality = "high";
  context.drawImage(canvas, 0, 0, target.width, target.height);
  return resized;
}

/**
 * Renders what the user is looking at right now.
 *
 * Runs off the DOM rather than `getDisplayMedia` on purpose: a screen-share
 * permission prompt on every report would cost more reports than it captures.
 * Returns null instead of throwing — a screenshot is never worth losing the
 * written feedback.
 */
export async function captureViewport(
  options: CaptureOptions = {}
): Promise<CapturedImage | null> {
  try {
    const { snapdom } = await import("@zumer/snapdom");
    const target = options.element ?? document.documentElement;

    const canvas = await snapdom.toCanvas(
      target,
      buildSnapdomOptions({
        devicePixelRatio: window.devicePixelRatio,
        element: options.element,
        excludeSelectors: options.excludeSelectors,
      })
    );

    const fitted = fitWithin(
      { height: canvas.height, width: canvas.width },
      options.maxWidth ?? DEFAULT_MAX_WIDTH
    );
    const output = fitted.scale === 1 ? canvas : downscale(canvas, fitted);

    const blob = await toBlob(output);
    if (!blob) {
      return null;
    }

    return {
      blob,
      height: output.height,
      mimeType: "image/png",
      objectUrl: URL.createObjectURL(blob),
      width: output.width,
    };
  } catch {
    return null;
  }
}

export function releaseCapture(image: CapturedImage | null | undefined): void {
  if (image) {
    URL.revokeObjectURL(image.objectUrl);
  }
}
