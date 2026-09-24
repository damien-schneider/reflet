import { deriveTitle, uploadImageBlob } from "../../../feedback/core/submit";
import type {
  CreateFeedbackResponse,
  FeedbackContext,
  SaveScreenshotParams,
} from "../../../types";
import { reportFailure } from "../notices";
import { callReflet } from "../route/dev-route";
import { type DevNote, noteStore, type StoredImage } from "./note-store";

const DEVTOOLS_SOURCE = "reflet-devtools";

function reportContext(note: DevNote): FeedbackContext {
  return {
    ...note.capturedContext,
    metadata: { ...note.capturedContext.metadata, source: DEVTOOLS_SOURCE },
    selections: [{ ...note.selection, comment: note.note || undefined }],
  };
}

async function attachCloseUp(
  note: DevNote,
  feedbackId: string,
  closeUp: StoredImage
) {
  const { uploadUrl } = await callReflet<{ uploadUrl: string }>(
    "/api/v1/feedback/screenshot/upload-url",
    { body: {} }
  );
  const storageId = await uploadImageBlob(uploadUrl, closeUp);
  await callReflet("/api/v1/feedback/screenshot/save", {
    body: {
      captureSource: "element",
      feedbackId,
      filename: "element.png",
      height: closeUp.height,
      mimeType: closeUp.mimeType,
      pageUrl: note.capturedContext.url,
      size: closeUp.blob.size,
      storageId,
      width: closeUp.width,
    } satisfies SaveScreenshotParams,
  });
}

function uploadCloseUp(note: DevNote, feedbackId: string, title: string) {
  noteStore
    .readCloseUp(note.id)
    .then((closeUp) => closeUp && attachCloseUp(note, feedbackId, closeUp))
    .catch((error: unknown) =>
      reportFailure(
        `"${title}" is on the board, but its close-up did not upload`,
        error,
        () => uploadCloseUp(note, feedbackId, title)
      )
    );
}

function markSent(noteId: string, feedbackId: string, title: string) {
  noteStore
    .patch(noteId, (note) => ({
      ...note,
      sent: { at: Date.now(), feedbackId },
    }))
    .catch((error: unknown) =>
      reportFailure(
        `"${title}" is on the board, but not marked sent here`,
        error,
        () => markSent(noteId, feedbackId, title)
      )
    );
}

/**
 * Files the latest version of the note exactly once: a failure after the
 * board has it only ever retries the local step, never the filing.
 */
async function sendNote(noteId: string): Promise<void> {
  const note = noteStore
    .getSnapshot()
    .notes.find((stored) => stored.id === noteId);
  if (!note || note.sent) {
    noteStore.setActivity(noteId, null);
    return;
  }
  const title = deriveTitle(note.note) || `Note on ${note.selection.label}`;
  noteStore.setActivity(noteId, "sending");
  let feedbackId: string;
  try {
    const created = await callReflet<Partial<CreateFeedbackResponse>>(
      "/api/v1/feedback/create",
      {
        body: {
          context: reportContext(note),
          description: note.note || title,
          title,
        },
      }
    );
    if (typeof created.feedbackId !== "string") {
      throw new Error("The board answered without a feedback id.");
    }
    feedbackId = created.feedbackId;
  } catch (error) {
    noteStore.setActivity(noteId, null);
    reportFailure(`"${title}" was not sent`, error, () => {
      sendNote(noteId);
    });
    return;
  }
  markSent(noteId, feedbackId, title);
  noteStore.setActivity(noteId, null);
  uploadCloseUp(note, feedbackId, title);
}

/** One by one, oldest first, so the board keeps the order the notes were taken in. */
export async function sendNotesToBoard(notes: DevNote[]): Promise<void> {
  const oldestFirst = [...notes].sort((a, b) => a.createdAt - b.createdAt);
  for (const note of oldestFirst) {
    noteStore.setActivity(note.id, "sending");
  }
  for (const note of oldestFirst) {
    await sendNote(note.id);
  }
}
