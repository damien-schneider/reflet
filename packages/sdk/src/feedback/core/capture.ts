import type { CapturedImage } from "../types";

/** Marks every node the widget owns, so captures never include the panel. */
export const WIDGET_MARKER = "data-reflet-widget";

const MAX_PIXEL_RATIO = 2;
const DEFAULT_MAX_WIDTH = 2400;
const MAX_INLINE_BYTES = 3_000_000;
const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const EXTERNAL_URL = /^(https?:)?\/\//i;
const CSS_URL = /url\((['"]?)([^)'"]+)\1\)/g;

/**
 * snapdom reloads cross-origin images with `crossOrigin=anonymous`; when that
 * reload fails to decode (cached copy without CORS headers — Convex storage
 * does this) its fallback promise never settles and the capture hangs forever.
 * Fetching the bytes ourselves and swapping in data URLs for the duration of
 * the capture starves that path: data URLs always decode.
 */
interface SourceSwap {
  element: Element;
  name: string;
  value: string | null;
}

function isExternalImageUrl(url: string): boolean {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) {
    return false;
  }
  if (!EXTERNAL_URL.test(url)) {
    return false;
  }
  try {
    return new URL(url, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}

function toDataUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    fetch(url, { mode: "cors" })
      .then(async (response) => {
        if (!response.ok) {
          resolve(null);
          return;
        }
        const blob = await response.blob();
        if (blob.size === 0 || blob.size > MAX_INLINE_BYTES) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = () =>
          resolve(typeof reader.result === "string" ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      })
      .catch(() => resolve(null));
  });
}

const PNG_NORMALIZE_TIMEOUT = 750;
const CAPTURE_TIMEOUT = 10_000;
const ANIMATION_SETTLE_TIMEOUT = 1000;

/** The widget is excluded from every capture, so its own motion (a pulsing pin) is not worth waiting for. */
function isWidgetAnimation(animation: Animation): boolean {
  const target =
    animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
  const root = target?.getRootNode();
  return root instanceof ShadowRoot && root.host.hasAttribute(WIDGET_MARKER);
}
/**
 * Tiles and sections routinely animate in or reflow (grid drags, entrance
 * transitions); a capture taken mid-flight freezes them displaced. Waits for
 * animations touching the page to finish, capped so an infinite spinner can
 * never stall the report.
 */
async function waitForPageAnimations(): Promise<void> {
  if (typeof document.getAnimations !== "function") {
    return;
  }
  const start = performance.now();
  while (performance.now() - start < ANIMATION_SETTLE_TIMEOUT) {
    const running = document
      .getAnimations()
      .filter(
        (animation) =>
          animation.playState === "running" && !isWidgetAnimation(animation)
      );
    if (running.length === 0) {
      return;
    }
    await Promise.race([
      Promise.allSettled(running.map((animation) => animation.finished)),
      new Promise((resolve) => setTimeout(resolve, 150)),
    ]);
  }
}

/**
 * snapdom awaits `decode()` on images created with `decoding="sync"` — a
 * promise Chrome 151 sometimes never settles (observed for cross-origin
 * webp, cached or inlined). Re-encoding through a canvas yields a PNG data
 * url, which decodes reliably; the load itself goes through `onload`, never
 * `decode()`.
 */
function normalizeToPng(dataUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const image = new Image();
    const timeout = setTimeout(() => resolve(dataUrl), PNG_NORMALIZE_TIMEOUT);
    image.onload = () => {
      clearTimeout(timeout);
      try {
        if (image.naturalWidth === 0 || image.naturalHeight === 0) {
          resolve(null);
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) {
          resolve(dataUrl);
          return;
        }
        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };
    image.src = dataUrl;
  });
}

async function toInlineUrl(url: string): Promise<string | null> {
  const dataUrl = await toDataUrl(url);
  if (!dataUrl) {
    return null;
  }
  return normalizeToPng(dataUrl);
}

function remember(swaps: SourceSwap[], element: Element, name: string): void {
  swaps.push({ element, name, value: element.getAttribute(name) });
}

async function inlineImgSource(
  img: HTMLImageElement,
  swaps: SourceSwap[]
): Promise<void> {
  const src = img.getAttribute("src");
  if (!(src && isExternalImageUrl(src))) {
    return;
  }

  const dataUrl = await toInlineUrl(src);
  if (dataUrl) {
    if (img.hasAttribute("srcset")) {
      remember(swaps, img, "srcset");
      img.removeAttribute("srcset");
    }
    if (img.hasAttribute("sizes")) {
      remember(swaps, img, "sizes");
      img.removeAttribute("sizes");
    }
  }
  remember(swaps, img, "src");
  img.setAttribute("src", dataUrl ?? TRANSPARENT_PIXEL);
}

async function inlineBackgroundImages(
  element: Element,
  swaps: SourceSwap[]
): Promise<void> {
  const style = element.getAttribute("style");
  if (!style) {
    return;
  }
  const urls = [...style.matchAll(CSS_URL)].map((match) => match[2] ?? "");
  if (!urls.some(isExternalImageUrl)) {
    return;
  }

  let next = style;
  for (const url of urls) {
    if (!isExternalImageUrl(url)) {
      continue;
    }
    const dataUrl = await toInlineUrl(url);
    next = next.split(url).join(dataUrl ?? TRANSPARENT_PIXEL);
  }
  if (next !== style) {
    remember(swaps, element, "style");
    element.setAttribute("style", next);
  }
}

/**
 * Swaps every cross-origin image under `root` for a data URL so the capture
 * cannot hit snapdom's decode-failure hang. Returns the undo list — always
 * run it, even after a failed capture.
 */
export async function inlineExternalImages(
  root: Element
): Promise<SourceSwap[]> {
  const swaps: SourceSwap[] = [];

  for (const img of [...root.querySelectorAll("img")]) {
    await inlineImgSource(img, swaps);
  }
  for (const el of [...root.querySelectorAll("[style*='url(']")]) {
    await inlineBackgroundImages(el, swaps);
  }

  return swaps;
}

export function restoreInlinedImages(swaps: SourceSwap[]): void {
  for (const swap of swaps) {
    if (swap.value === null) {
      swap.element.removeAttribute(swap.name);
    } else {
      swap.element.setAttribute(swap.name, swap.value);
    }
  }
}

export interface CaptureOptions {
  /** Capture this element instead of the visible viewport. */
  element?: Element;
  excludeSelectors?: string[];
  maxWidth?: number;
  /** Hard cap for one capture attempt before falling back. Default 10s. */
  timeout?: number;
}

interface SnapdomOptions {
  cache: "disabled";
  clip?: "viewport";
  dpr: number;
  embedFonts: boolean;
  exclude: string[];
  fast: boolean;
  filter?: (element: Element) => boolean;
  reconcile: boolean;
}

export function buildSnapdomOptions(options: {
  devicePixelRatio?: number;
  element?: Element;
  excludeSelectors?: string[];
  filter?: (element: Element) => boolean;
}): SnapdomOptions {
  const ratio = options.devicePixelRatio ?? 1;

  return {
    cache: "disabled",
    clip: options.element ? undefined : "viewport",
    dpr: Math.min(Math.max(ratio || 1, 1), MAX_PIXEL_RATIO),
    embedFonts: true,
    exclude: [`[${WIDGET_MARKER}]`, ...(options.excludeSelectors ?? [])],
    fast: true,
    filter: options.filter,
    reconcile: true,
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

/** Wraps a rendered canvas as an owned capture, downscaled to `maxWidth`. */
export async function capturedFromCanvas(
  source: HTMLCanvasElement,
  maxWidth: number
): Promise<CapturedImage | null> {
  const fitted = fitWithin(
    { height: source.height, width: source.width },
    maxWidth
  );
  const output = fitted.scale === 1 ? source : downscale(source, fitted);

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
    await waitForPageAnimations();
    const swaps = await inlineExternalImages(target);

    const shoot = (withoutImages = false): Promise<HTMLCanvasElement> => {
      const attempt = snapdom.toCanvas(
        target,
        buildSnapdomOptions({
          devicePixelRatio: window.devicePixelRatio,
          element: options.element,
          excludeSelectors: options.excludeSelectors,
          filter: withoutImages
            ? (element) => element.tagName !== "IMG"
            : undefined,
        })
      );
      attempt.catch(() => undefined);
      return Promise.race([
        attempt,
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("capture timed out")),
            options.timeout ?? CAPTURE_TIMEOUT
          )
        ),
      ]);
    };

    let canvas: HTMLCanvasElement;
    try {
      canvas = await shoot();
    } catch {
      canvas = await shoot(true);
    } finally {
      restoreInlinedImages(swaps);
    }

    return await capturedFromCanvas(
      canvas,
      options.maxWidth ?? DEFAULT_MAX_WIDTH
    );
  } catch {
    return null;
  }
}

export function releaseCapture(image: CapturedImage | null | undefined): void {
  if (image) {
    URL.revokeObjectURL(image.objectUrl);
  }
}
