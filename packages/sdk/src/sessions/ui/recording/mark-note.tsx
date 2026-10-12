import { useEffect, useRef, useState } from "react";
import { isSubmitEnter } from "../../../feedback/ui/keyboard";

const UNTOUCHED_NOTE_MS = 6000;

export function MarkNote({
  focusOnOpen,
  onClose,
}: {
  focusOnOpen: boolean;
  onClose: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isTouched = note !== "";

  useEffect(() => {
    if (focusOnOpen) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [focusOnOpen]);

  useEffect(() => {
    if (isTouched) {
      return;
    }
    const timer = setTimeout(() => onClose(""), UNTOUCHED_NOTE_MS);
    return () => clearTimeout(timer);
  }, [isTouched, onClose]);

  return (
    <div className="dt-rec-note">
      <span aria-hidden="true">Moment marked ·</span>
      <input
        aria-label="Moment marked · Add a note"
        className="dt-field"
        maxLength={1000}
        onChange={(event) => setNote(event.target.value)}
        onKeyDown={(event) => {
          if (isSubmitEnter(event.nativeEvent)) {
            event.preventDefault();
            onClose(note.trim());
          } else if (event.key === "Escape") {
            onClose("");
          }
        }}
        placeholder="Add a note"
        ref={inputRef}
        value={note}
      />
    </div>
  );
}
