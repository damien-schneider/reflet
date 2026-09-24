import type { CodeTarget } from "../code/code-panel";
import { CopyButton } from "../copy-button";
import { reportFailure } from "../notices";
import { notesToPrompt } from "./agent-prompt";
import { NoteCard } from "./note-card";
import {
  type DevNote,
  isActiveNote,
  isNoteOnPage,
  type NotesSnapshot,
  noteStore,
  pinNumbers,
} from "./note-store";
import { sendNotesToBoard } from "./send-notes";

function archiveNotes(noteIds: string[]) {
  const archivedAt = Date.now();
  noteStore
    .patch(noteIds, (note) => ({ ...note, archivedAt }))
    .catch((error: unknown) =>
      reportFailure("The notes were not cleared", error, () =>
        archiveNotes(noteIds)
      )
    );
}

function restoreNotes(noteIds: string[]) {
  noteStore
    .patch(noteIds, ({ archivedAt: _archivedAt, ...note }) => note)
    .catch((error: unknown) =>
      reportFailure("The notes were not restored", error, () =>
        restoreNotes(noteIds)
      )
    );
}

function ArchivedNotes({ archived }: { archived: DevNote[] }) {
  if (archived.length === 0) {
    return null;
  }
  const ids = archived.map((note) => note.id);
  return (
    <div className="dt-archived">
      <p className="dt-meta">
        {archived.length} cleared {archived.length === 1 ? "note" : "notes"},
        deleted for good a day after clearing.
      </p>
      <button
        className="dt-btn"
        onClick={() => restoreNotes(ids)}
        type="button"
      >
        Restore
      </button>
      <button
        className="dt-btn"
        data-variant="danger"
        onClick={() =>
          noteStore
            .remove(ids)
            .catch((error: unknown) =>
              reportFailure("The cleared notes were not deleted", error)
            )
        }
        type="button"
      >
        Delete now
      </button>
    </div>
  );
}

function SendToBoard({
  activity,
  sendBlockedReason,
  unsent,
}: {
  activity: NotesSnapshot["activity"];
  sendBlockedReason: string | null;
  unsent: DevNote[];
}) {
  const ready = unsent.filter((note) => activity[note.id] === undefined);
  const busyCount = unsent.length - ready.length;
  if (unsent.length === 0) {
    return null;
  }
  return (
    <>
      {sendBlockedReason && <p className="dt-hint">{sendBlockedReason}</p>}
      <button
        className="dt-btn"
        disabled={sendBlockedReason !== null || ready.length === 0}
        onClick={() => sendNotesToBoard(ready)}
        type="button"
      >
        {ready.length > 0 && `Send ${ready.length} to board`}
        {ready.length === 0 &&
          (unsent.some((note) => activity[note.id] === "locating")
            ? "Locating…"
            : "Sending…")}
      </button>
      {busyCount > 0 && ready.length > 0 && (
        <span className="dt-status">{busyCount} still locating or sending</span>
      )}
    </>
  );
}

export function NotesPanel({
  notes: snapshot,
  onOpenCode,
  onShowSelector,
  sendBlockedReason,
}: {
  notes: NotesSnapshot;
  onOpenCode: (target: CodeTarget) => void;
  onShowSelector: (selector: string) => boolean;
  sendBlockedReason: string | null;
}) {
  const { activity, error, notes: allNotes, status } = snapshot;

  if (status === "failed") {
    return <p className="dt-error">Notes cannot be stored: {error}</p>;
  }
  if (status === "loading") {
    return <p className="dt-status">Loading notes…</p>;
  }

  const notes = allNotes.filter(isActiveNote);
  const archived = allNotes.filter((note) => !isActiveNote(note));

  if (notes.length === 0) {
    return (
      <>
        <div className="dt-empty">
          <p>No notes yet.</p>
          <p>
            Use the pick button, then click an element to write one — or
            Shift+click it to open its code.
          </p>
        </div>
        <ArchivedNotes archived={archived} />
      </>
    );
  }

  const { pathname } = window.location;
  const numbers = pinNumbers(notes, pathname);
  const onThisPage = notes.filter((note) => isNoteOnPage(note, pathname));
  const elsewhere = notes.filter((note) => !isNoteOnPage(note, pathname));
  const unsent = notes.filter((note) => !note.sent);
  const clearable = notes
    .filter((note) => activity[note.id] !== "sending")
    .map((note) => note.id);

  const renderNote = (note: DevNote, isHere: boolean) => (
    <NoteCard
      isLocating={activity[note.id] === "locating"}
      isSending={activity[note.id] === "sending"}
      key={note.id}
      note={note}
      onOpenCode={onOpenCode}
      onShowSelector={isHere ? onShowSelector : undefined}
      pageLink={!isHere}
      pinNumber={numbers.get(note.id)}
    />
  );

  return (
    <>
      {onThisPage.length > 0 && <h2 className="dt-group">This page</h2>}
      {onThisPage.map((note) => renderNote(note, true))}
      {elsewhere.length > 0 && <h2 className="dt-group">Other pages</h2>}
      {elsewhere.map((note) => renderNote(note, false))}
      <ArchivedNotes archived={archived} />
      <div className="dt-sheet-foot">
        <CopyButton
          label={`Copy ${notes.length} as prompt`}
          text={notesToPrompt(notes)}
          variant="primary"
        />
        <SendToBoard
          activity={activity}
          sendBlockedReason={sendBlockedReason}
          unsent={unsent}
        />
        {clearable.length > 0 && (
          <button
            className="dt-btn"
            onClick={() => archiveNotes(clearable)}
            type="button"
          >
            Clear notes
          </button>
        )}
      </div>
    </>
  );
}
