import { useEffect, useRef } from "react";
import { useFocusWhen } from "../review/transcript/remove-evidence";

export function CancelConfirmation({
  onCancelRecording,
  onKeepRecording,
}: {
  onCancelRecording: () => void;
  onKeepRecording: () => void;
}) {
  const confirmationRef = useRef<HTMLDivElement>(null);
  const keepRef = useFocusWhen<HTMLButtonElement>(true);

  useEffect(() => {
    const confirmation = confirmationRef.current;
    if (!confirmation) {
      return;
    }
    const keepOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.isComposing) {
        event.stopPropagation();
        onKeepRecording();
      }
    };
    confirmation.addEventListener("keydown", keepOnEscape);
    return () => confirmation.removeEventListener("keydown", keepOnEscape);
  }, [onKeepRecording]);

  return (
    <div
      aria-labelledby="rf-rec-cancel-copy"
      className="dt-rec-note"
      ref={confirmationRef}
      role="alertdialog"
    >
      <span id="rf-rec-cancel-copy">
        Cancel this recording? Nothing from it is kept.
      </span>
      <button
        className="dt-btn"
        data-variant="danger"
        onClick={onCancelRecording}
        type="button"
      >
        Discard
      </button>
      <button
        className="dt-btn"
        onClick={onKeepRecording}
        ref={keepRef}
        type="button"
      >
        Keep recording
      </button>
    </div>
  );
}
