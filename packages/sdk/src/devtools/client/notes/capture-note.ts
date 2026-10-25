import { releaseCapture } from "../../../feedback/core/capture";
import { buildElementSelection } from "../../../feedback/core/element-selector";
import { collectPageContext } from "../../../feedback/core/page-context";
import { type CapturedImage, SDK_VERSION } from "../../../feedback/types";
import { locateElementSource } from "../element-source";
import { newLocalId } from "../local-id";
import type { SourceRequest } from "../route/dev-route";
import { describeSource } from "../source-location";
import { captureElementSnapshot } from "./element-snapshot";
import { type DevNote, noteStore } from "./note-store";

interface LocatedSource {
  source: SourceRequest;
  sourceLocation: string;
}

async function locateSource(
  element: Element,
  canReadSource: boolean
): Promise<LocatedSource | null> {
  const source = await locateElementSource(element).catch(() => null);
  if (!source) {
    return null;
  }
  return {
    source,
    sourceLocation: await describeSource(source, canReadSource),
  };
}

function withSource(note: DevNote, located: LocatedSource): DevNote {
  return {
    ...note,
    selection: { ...note.selection, sourceLocation: located.sourceLocation },
    source: located.source,
  };
}

/** Everything the DOM can answer synchronously, so the note exists the moment it is written. */
export function draftNote(element: Element, note: string): DevNote {
  const selection = buildElementSelection(element);
  return {
    capturedContext: collectPageContext({ sdkVersion: SDK_VERSION }),
    createdAt: Date.now(),
    id: newLocalId(),
    note,
    selection: { ...selection, comment: note || undefined },
    source: null,
  };
}

/** The whole note in one go, source included: a copy has no stored note to fill in later. */
export async function draftLocatedNote(
  element: Element,
  note: string,
  canReadSource: boolean
): Promise<DevNote> {
  const draft = draftNote(element, note);
  const located = await locateSource(element, canReadSource);
  return located ? withSource(draft, located) : draft;
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
    const [located, snapshot] = await Promise.all([
      locateSource(element, canReadSource),
      captureElementSnapshot(element).catch(() => null),
    ]);
    closeUp = snapshot;
    if (located) {
      await noteStore.patch(noteId, (note) => withSource(note, located));
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
