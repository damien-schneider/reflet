import { useEffect, useId, useRef, useState } from "react";
import type { Annotation, Point } from "../../../types";
import { CheckIcon, CloseIcon } from "../../icons";

export interface TextDraft {
  annotation: Annotation;
  fontSize: number;
  position: Point;
}

export function TextAnnotationEditor({
  draft,
  onCommit,
  onCancel,
}: {
  draft: TextDraft;
  onCommit: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(draft.annotation.text ?? "");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const id = useId().replaceAll(":", "");
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  return (
    <form
      className="glass text-annotation-editor"
      id={id}
      onSubmit={(event) => {
        event.preventDefault();
        onCommit(text);
      }}
    >
      <style>{`[id="${id}"] { left: clamp(12px, ${draft.position.x}px, calc(100vw - 252px)); top: clamp(12px, ${draft.position.y}px, calc(100dvh - 148px)); }`}</style>
      <textarea
        aria-label="Text annotation"
        maxLength={280}
        onBlur={(event) => {
          if (!event.currentTarget.form?.contains(event.relatedTarget)) {
            onCommit(text);
          }
        }}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onCancel();
          }
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onCommit(text);
          }
        }}
        placeholder="Type a note…"
        ref={inputRef}
        rows={2}
        value={text}
      />
      <div className="text-annotation-actions">
        <button
          aria-label="Cancel text"
          className="tool"
          onClick={onCancel}
          type="button"
        >
          <CloseIcon />
        </button>
        <button aria-label="Apply text" className="done-btn" type="submit">
          <CheckIcon size={16} />
        </button>
      </div>
    </form>
  );
}
