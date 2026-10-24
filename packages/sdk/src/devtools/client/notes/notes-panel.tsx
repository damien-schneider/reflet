import { TargetIcon } from "../../../feedback/ui/icons";
import { countLabel } from "../../../sessions/ui/session-format";
import type { CodeTarget } from "../code/use-code-lookup";
import { CopyButton } from "../copy-button";
import { reportFailure } from "../notices";
import type { BoardCall } from "../route/dev-route";
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
  boardCall,
  sendBlockedReason,
  unsent,
}: {
  activity: NotesSnapshot["activity"];
  boardCall: BoardCall;
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
        onClick={() => sendNotesToBoard(ready, boardCall)}
        type="button"
      >
        {ready.length > 0 && `Add ${ready.length} to board`}
        {ready.length === 0 &&
          (unsent.some((note) => activity[note.id] === "locating")
            ? "Locating…"
            : "Adding…")}
      </button>
      {busyCount > 0 && ready.length > 0 && (
        <span className="dt-status">{busyCount} still locating or adding</span>
      )}
    </>
  );
}

function NotesEmpty({
  canOpenCode,
  onPick,
}: {
  canOpenCode: boolean;
  onPick: () => void;
}) {
  return (
    <div className="dt-empty">
      <h2 className="dt-empty-title">No notes yet</h2>
      <p>
        Pick an element on the page and write what should change.
        {canOpenCode && " Shift-click it to open its code instead."}
      </p>
      <button
        className="dt-btn"
        data-variant="primary"
        onClick={onPick}
        type="button"
      >
        <TargetIcon />
        Pick an element
      </button>
    </div>
  );
}

function NotesToolbar({
  count,
  onPick,
}: {
  count: number;
  onPick: () => void;
}) {
  return (
    <div className="dt-toolbar">
      <span className="dt-status">{countLabel(count, "note")}</span>
      <button
        aria-label="Pick an element to note"
        className="icon-btn"
        onClick={onPick}
        title="Pick an element to note"
        type="button"
      >
        <TargetIcon />
      </button>
    </div>
  );
}

function NotesFooter({
  activity,
  boardCall,
  notes,
  sendBlockedReason,
}: {
  activity: NotesSnapshot["activity"];
  boardCall: BoardCall;
  notes: DevNote[];
  sendBlockedReason: string | null;
}) {
  const clearable = notes
    .filter((note) => activity[note.id] !== "sending")
    .map((note) => note.id);
  return (
    <div className="dt-sheet-foot">
      <CopyButton
        label={`Copy ${notes.length} as prompt`}
        text={notesToPrompt(notes)}
        variant="primary"
      />
      <SendToBoard
        activity={activity}
        boardCall={boardCall}
        sendBlockedReason={sendBlockedReason}
        unsent={notes.filter((note) => !note.sent)}
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
  );
}

function NoteGroups({
  activity,
  notes,
  onOpenCode,
  onShowSelector,
}: {
  activity: NotesSnapshot["activity"];
  notes: DevNote[];
  onOpenCode?: (target: CodeTarget) => void;
  onShowSelector: (selector: string) => boolean;
}) {
  const { pathname } = window.location;
  const numbers = pinNumbers(notes, pathname);
  const onThisPage = notes.filter((note) => isNoteOnPage(note, pathname));
  const elsewhere = notes.filter((note) => !isNoteOnPage(note, pathname));

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
    </>
  );
}

export function NotesPanel({
  boardCall,
  notes: snapshot,
  onOpenCode,
  onPick,
  onShowSelector,
  sendBlockedReason,
}: {
  boardCall: BoardCall;
  notes: NotesSnapshot;
  onOpenCode?: (target: CodeTarget) => void;
  onPick: () => void;
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
        <NotesEmpty canOpenCode={onOpenCode !== undefined} onPick={onPick} />
        <ArchivedNotes archived={archived} />
      </>
    );
  }

  return (
    <>
      <NotesToolbar count={notes.length} onPick={onPick} />
      <NoteGroups
        activity={activity}
        notes={notes}
        onOpenCode={onOpenCode}
        onShowSelector={onShowSelector}
      />
      <ArchivedNotes archived={archived} />
      <NotesFooter
        activity={activity}
        boardCall={boardCall}
        notes={notes}
        sendBlockedReason={sendBlockedReason}
      />
    </>
  );
}
