import {
  type BinaryWriter,
  imageExtensionOf,
  nodeBinaryWriter,
  safeFileStem,
} from "../commands/screenshot-download";
import type { LiveEntry, LiveFeed } from "./live-feed";

export const LIVE_SESSIONS_DIRECTORY = ".reflet/sessions";

const SCREENSHOT_REQUEST_TIMEOUT_MS = 20_000;

interface SaveOptions {
  fetchFile?: typeof fetch;
  writer?: BinaryWriter;
}

/** A screenshot that fails to download is reported missing instead of holding back what was said. */
export async function saveCitedScreenshots(
  input: {
    entries: LiveEntry[];
    screenshots: LiveFeed["screenshots"];
    sessionId: string;
  },
  options: SaveOptions = {}
): Promise<Map<string, string>> {
  const fetchFile = options.fetchFile ?? fetch;
  const writer = options.writer ?? nodeBinaryWriter;
  const cited = new Set(
    input.entries.flatMap(({ screenshotIds }) => screenshotIds)
  );
  const directory = `${LIVE_SESSIONS_DIRECTORY}/${safeFileStem(input.sessionId)}`;
  const saved = new Map<string, string>();

  for (const { id, url } of input.screenshots) {
    if (!cited.has(id)) {
      continue;
    }
    const response = await fetchFile(url, {
      signal: AbortSignal.timeout(SCREENSHOT_REQUEST_TIMEOUT_MS),
    }).catch(() => null);
    if (!response?.ok) {
      continue;
    }
    const mimeType = response.headers.get("content-type")?.split(";")[0] ?? "";
    const path = `${directory}/${safeFileStem(id)}.${imageExtensionOf(mimeType.trim())}`;
    writer.write(path, new Uint8Array(await response.arrayBuffer()));
    saved.set(id, path);
  }
  return saved;
}
