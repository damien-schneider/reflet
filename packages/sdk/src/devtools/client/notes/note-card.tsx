import { useEffect, useState } from "react";
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
    let objectUrl: string | null = null;
    noteStore
      .readCloseUp(noteId)
      .then((image) => {
        if (active && image) {
          objectUrl = URL.createObjectURL(image.blob);
          setPreview({
            height: image.height,
            url: objectUrl,
            width: image.width,
          });
        }
      })
      .catch(() => setPreview(null));
    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
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

function NoteEditor({ note, onDone }: { note: DevNote; onDone: () => void }) {
  const [text, setText] = useState(note.note);
  const save = () => {
    saveNoteText(note.id, text.trim());
    onDone();
  };

  return (
    <>
      <textarea
        aria-label="Note"
        className="dt-field"
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
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
  const { selection, source } = note;
  const owner = selection.componentStack[0];

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
        {note.sent && !isSending && (
          <span className="dt-chip">On the board</span>
        )}
      </div>
      {source && selection.sourceLocation && (
        <button
          className="dt-source"
          onClick={() =>
            onOpenCode({ request: source, title: selection.label })
          }
          type="button"
        >
          {selection.sourceLocation}
        </button>
      )}
      {!source && isLocating && <p className="dt-meta">Locating source…</p>}
      {!(source || isLocating) && (
        <p className="dt-meta">{selection.region ?? selection.selector}</p>
      )}
      {isEditing ? (
        <NoteEditor note={note} onDone={() => setIsEditing(false)} />
      ) : (
        <p className="dt-note-text">{note.note || "No comment"}</p>
      )}
      {isOffPage && (
        <p className="dt-meta">The element is not on the page right now.</p>
      )}
      {!isEditing && (
        <div className="dt-actions">
          {onShowSelector && (
            <button
              className="dt-btn"
              onClick={() => setIsOffPage(!onShowSelector(selection.selector))}
              type="button"
            >
              Show on page
            </button>
          )}
          {pageLink && (
            <a className="dt-btn" href={note.capturedContext.url}>
              Open page
            </a>
          )}
          {!(note.sent || isSending) && (
            <button
              className="dt-btn"
              onClick={() => setIsEditing(true)}
              type="button"
            >
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
      )}
    </article>
  );
}
