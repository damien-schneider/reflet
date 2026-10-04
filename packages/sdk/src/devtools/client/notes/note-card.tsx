import { useEffect, useState } from "react";
import { isSubmitEnter } from "../../../feedback/ui/keyboard";
import type { CodeTarget } from "../code/code-panel";
import { reportFailure } from "../notices";
import { type DevNote, noteStore } from "./note-store";

interface CloseUpPreview {
  height: number;
  url: string;
  width: number;
}

/** Re-read once locating ends: the close-up lands in storage after the note does. */
function useCloseUpPreview(
  noteId: string,
  isLocating: boolean
): CloseUpPreview | null {
  const [preview, setPreview] = useState<CloseUpPreview | null>(null);

  useEffect(() => {
    if (isLocating) {
      return;
    }
    let active = true;
    let revokePreviewUrl: () => void = () => undefined;
    noteStore
      .readCloseUp(noteId)
      .then((image) => {
        if (!(active && image)) {
          return;
        }
        const url = URL.createObjectURL(image.blob);
        revokePreviewUrl = () => URL.revokeObjectURL(url);
        setPreview({ height: image.height, url, width: image.width });
      })
      .catch(() => setPreview(null));
    return () => {
      active = false;
      revokePreviewUrl();
    };
  }, [isLocating, noteId]);

  return preview;
}

function saveNoteText(noteId: string, text: string) {
  noteStore
    .patch(noteId, (note) => ({
      ...note,
      note: text,
      selection: { ...note.selection, comment: text || undefined },
    }))
    .catch((error: unknown) =>
      reportFailure("The note edit was not saved", error, () =>
        saveNoteText(noteId, text)
      )
    );
}

function deleteNote(note: DevNote) {
  noteStore
    .remove([note.id])
    .catch((error: unknown) =>
      reportFailure("The note was not deleted", error, () => deleteNote(note))
    );
}

function NoteEditor({
  initialText,
  noteId,
  onDone,
}: {
  initialText: string;
  noteId: string;
  onDone: () => void;
}) {
  const [text, setText] = useState(initialText);
  const save = () => {
    saveNoteText(noteId, text.trim());
    onDone();
  };

  return (
    <>
      <textarea
        aria-label="Note"
        className="dt-field"
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (isSubmitEnter(event.nativeEvent)) {
            event.preventDefault();
            save();
          }
        }}
        rows={3}
        value={text}
      />
      <div className="dt-actions">
        <button
          className="dt-btn"
          data-variant="primary"
          onClick={save}
          type="button"
        >
          Save
        </button>
        <button className="dt-btn" onClick={onDone} type="button">
          Cancel
        </button>
      </div>
    </>
  );
}

function NoteCardHead({
  isSending,
  note,
  pinNumber,
}: {
  isSending: boolean;
  note: DevNote;
  pinNumber?: number;
}) {
  const { selection } = note;
  const owner = selection.componentStack[0];

  return (
    <div className="dt-card-head">
      {pinNumber !== undefined && (
        <span className="dt-pin-badge" title={`Pin ${pinNumber}`}>
          {pinNumber}
        </span>
      )}
      <h3 className="dt-card-title">
        {owner ? `<${owner}> ${selection.label}` : selection.label}
      </h3>
      {isSending && <span className="dt-chip">Sending…</span>}
      {note.sent && !isSending && <span className="dt-chip">On the board</span>}
    </div>
  );
}

function NoteSourceLine({
  isLocating,
  note,
  onOpenCode,
}: {
  isLocating: boolean;
  note: DevNote;
  onOpenCode: (target: CodeTarget) => void;
}) {
  const { selection, source } = note;

  if (source && selection.sourceLocation) {
    return (
      <button
        className="dt-source"
        onClick={() => onOpenCode({ request: source, title: selection.label })}
        type="button"
      >
        {selection.sourceLocation}
      </button>
    );
  }
  if (source) {
    return null;
  }
  if (isLocating) {
    return <p className="dt-meta">Locating source…</p>;
  }
  return <p className="dt-meta">{selection.region ?? selection.selector}</p>;
}

function NoteActions({
  isSending,
  note,
  onEdit,
  onShowSelector,
  pageLink,
}: {
  isSending: boolean;
  note: DevNote;
  onEdit: () => void;
  onShowSelector?: () => void;
  pageLink?: boolean;
}) {
  return (
    <div className="dt-actions">
      {onShowSelector && (
        <button className="dt-btn" onClick={onShowSelector} type="button">
          Show on page
        </button>
      )}
      {pageLink && (
        <a className="dt-btn" href={note.capturedContext.url}>
          Open page
        </a>
      )}
      {!(note.sent || isSending) && (
        <button className="dt-btn" onClick={onEdit} type="button">
          Edit
        </button>
      )}
      <button
        className="dt-btn"
        data-variant="danger"
        disabled={isSending}
        onClick={() => deleteNote(note)}
        type="button"
      >
        Delete
      </button>
    </div>
  );
}

export function NoteCard({
  isLocating,
  isSending = false,
  note,
  onOpenCode,
  onShowSelector,
  pageLink,
  pinNumber,
}: {
  isLocating: boolean;
  isSending?: boolean;
  note: DevNote;
  onOpenCode: (target: CodeTarget) => void;
  /** Absent where the element is already pointed at, like inside its own pin. */
  onShowSelector?: (selector: string) => boolean;
  pageLink?: boolean;
  pinNumber?: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isOffPage, setIsOffPage] = useState(false);
  const closeUp = useCloseUpPreview(note.id, isLocating);
  const showOnPage = onShowSelector
    ? () => setIsOffPage(!onShowSelector(note.selection.selector))
    : undefined;

  return (
    <article className="dt-card" data-sent={Boolean(note.sent)}>
      {closeUp && (
        <img
          alt=""
          className="dt-thumb"
          height={closeUp.height}
          src={closeUp.url}
          width={closeUp.width}
        />
      )}
      <NoteCardHead isSending={isSending} note={note} pinNumber={pinNumber} />
      <NoteSourceLine
        isLocating={isLocating}
        note={note}
        onOpenCode={onOpenCode}
      />
      {isEditing ? (
        <NoteEditor
          initialText={note.note}
          noteId={note.id}
          onDone={() => setIsEditing(false)}
        />
      ) : (
        <p className="dt-note-text">{note.note || "No comment"}</p>
      )}
      {isOffPage && (
        <p className="dt-meta">The element is not on the page right now.</p>
      )}
      {!isEditing && (
        <NoteActions
          isSending={isSending}
          note={note}
          onEdit={() => setIsEditing(true)}
          onShowSelector={showOnPage}
          pageLink={pageLink}
        />
      )}
    </article>
  );
}
