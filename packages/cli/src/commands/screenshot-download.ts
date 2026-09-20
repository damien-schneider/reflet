import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import type { RefletAdminClient } from "../api/client";

export const SCREENSHOT_DIRECTORY = ".reflet/screenshots";

const UNSAFE_CHARACTERS = /[^\w.-]+/g;
const LEADING_PUNCTUATION = /^[.-]+/;
const IMAGE_SUBTYPE = /^image\/([\w+-]+)$/;

export interface BinaryWriter {
  write: (path: string, bytes: Uint8Array) => void;
}

export const nodeBinaryWriter: BinaryWriter = {
  write(path, bytes) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, bytes);
  },
};

export interface DownloadedScreenshot {
  captureSource: string;
  id: string;
  pageUrl?: string;
  path: string;
}

export interface ScreenshotDownloadReport {
  directory: string;
  downloaded: DownloadedScreenshot[];
  unavailable: string[];
}

interface DownloadOptions {
  fetchFile?: typeof fetch;
  out?: string;
  writer?: BinaryWriter;
}

type ScreenshotClient = Pick<RefletAdminClient, "listScreenshots">;

function extensionOf(mimeType: string): string {
  const subtype = IMAGE_SUBTYPE.exec(mimeType)?.[1];
  return subtype === "jpeg" ? "jpg" : (subtype ?? "png");
}

function fileNameOf(
  screenshot: { filename: string; mimeType: string },
  index: number
): string {
  const sanitized = basename(screenshot.filename)
    .replace(UNSAFE_CHARACTERS, "-")
    .replace(LEADING_PUNCTUATION, "");
  const name = sanitized || `screenshot.${extensionOf(screenshot.mimeType)}`;
  return `${String(index + 1).padStart(2, "0")}-${name}`;
}

/**
 * An agent cannot look at a URL sitting in a JSON payload, so the bytes have to
 * land on disk. The user's arrows and highlights are baked into the image.
 */
export async function downloadScreenshots(
  client: ScreenshotClient,
  feedbackId: string,
  options: DownloadOptions = {}
): Promise<ScreenshotDownloadReport> {
  const directory = options.out ?? `${SCREENSHOT_DIRECTORY}/${feedbackId}`;
  const writer = options.writer ?? nodeBinaryWriter;
  const fetchFile = options.fetchFile ?? fetch;

  const screenshots = await client.listScreenshots(feedbackId);
  const downloaded: DownloadedScreenshot[] = [];
  const unavailable: string[] = [];

  for (const [index, screenshot] of screenshots.entries()) {
    if (!screenshot.url) {
      unavailable.push(screenshot._id);
      continue;
    }
    const response = await fetchFile(screenshot.url);
    if (!response.ok) {
      throw new Error(
        `Failed to download ${screenshot.filename}: status ${response.status}`
      );
    }
    const path = `${directory}/${fileNameOf(screenshot, index)}`;
    writer.write(path, new Uint8Array(await response.arrayBuffer()));
    downloaded.push({
      captureSource: screenshot.captureSource,
      id: screenshot._id,
      pageUrl: screenshot.pageUrl,
      path,
    });
  }

  return { directory, downloaded, unavailable };
}
