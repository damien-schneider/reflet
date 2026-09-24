import { releaseCapture } from "../../../feedback/core/capture";
import { buildElementSelection } from "../../../feedback/core/element-selector";
import { collectPageContext } from "../../../feedback/core/page-context";
import { shortenSourcePath } from "../../../feedback/core/react-source";
import { type CapturedImage, SDK_VERSION } from "../../../feedback/types";
import { locateElementSource } from "../element-source";
import { fetchSourceFile, type SourceRequest } from "../route/dev-route";
import { captureElementSnapshot } from "./element-snapshot";
import { type DevNote, noteStore } from "./note-store";

/** `file:line:column` with a 1-based column, the way editors and agents read it. */
function withPosition(
  path: string,
  position: { column: number | null; line: number | null }
): string {
  if (position.line === null) {
    return path;
  }
  return position.column === null
    ? `${path}:${position.line}`
    : `${path}:${position.line}:${position.column + 1}`;
}

/** Repository-relative when the dev route can resolve it, so agents find the file as-is. */
async function describeSource(
  source: SourceRequest,
  canReadSource: boolean
): Promise<string> {
  if (canReadSource) {
    const file = await fetchSourceFile(source).catch(() => null);
    if (file) {
      return withPosition(file.path, file);
    }
  }
  return withPosition(shortenSourcePath(source.fileName), source);
}

/** `crypto.randomUUID` only exists in secure contexts; a phone on the LAN IP is not one. */
function newNoteId(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  const randomHex = Array.from(randomBytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  return `${Date.now().toString(36)}-${randomHex}`;
}

/** Everything the DOM can answer synchronously, so the note exists the moment it is written. */
export function draftNote(element: Element, note: string): DevNote {
  const selection = buildElementSelection(element);
  return {
    capturedContext: collectPageContext({ sdkVersion: SDK_VERSION }),
    createdAt: Date.now(),
    id: newNoteId(),
    note,
    selection: { ...selection, comment: note || undefined },
    source: null,
  };
}

const locateAttempts = new Set<string>();

/** Once per note per page load: a note whose source cannot be found is not retried in a loop. */
export function hasTriedToLocate(noteId: string): boolean {
  return locateAttempts.has(noteId);
}

/**
 * The slow half — source maps and the close-up render — after the note is
 * already on screen. Best effort: a note without a source is still a note.
 */
export async function enrichNote(
  noteId: string,
  element: Element,
  canReadSource: boolean
): Promise<void> {
  locateAttempts.add(noteId);
  noteStore.setActivity(noteId, "locating");
  let closeUp: CapturedImage | null = null;
  try {
    const [source, snapshot] = await Promise.all([
      locateElementSource(element).catch(() => null),
      captureElementSnapshot(element).catch(() => null),
    ]);
    closeUp = snapshot;
    const sourceLocation = source
      ? await describeSource(source, canReadSource)
      : null;
    if (source && sourceLocation) {
      await noteStore.patch(noteId, (note) => ({
        ...note,
        selection: { ...note.selection, sourceLocation },
        source,
      }));
    }
    if (closeUp) {
      await noteStore.attachCloseUp(noteId, {
        blob: closeUp.blob,
        height: closeUp.height,
        mimeType: closeUp.mimeType,
        width: closeUp.width,
      });
    }
  } finally {
    releaseCapture(closeUp);
    noteStore.setActivity(noteId, null);
  }
}
