import { useEffect, useRef, useState } from "react";
import { announce } from "../../../../devtools/client/notices";
import type { SessionEvidence } from "../../../protocol";
import { formatClock } from "../../session-format";
import { useSessionAction, useSessionWorkspace } from "../../session-workspace";
import { type ReviewHandle, withEvidence } from "../use-session-detail";

const REMOVE_COPY =
  "Remove this screenshot? The image is deleted for good. Briefs you already copied or exported can't be recalled.";

function RemoveConfirmation({
  evidence,
  onCancel,
  review,
}: {
  evidence: SessionEvidence;
  onCancel: () => void;
  review: ReviewHandle;
}) {
  const { api } = useSessionWorkspace();
  const run = useSessionAction();
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  const remove = async () => {
    const removed = await run("The screenshot was not removed", () =>
      api.removeEvidence(evidence.id)
    );
    if (removed !== null) {
      review.patch((detail) => withEvidence(detail, removed));
      announce("Screenshot removed");
    }
  };
  return (
    <div className="dt-ses-banner">
      <p>{REMOVE_COPY}</p>
      <div className="dt-actions">
        <button
          className="dt-btn"
          data-variant="danger"
          onClick={remove}
          type="button"
        >
          Remove
        </button>
        <button
          className="dt-btn"
          onClick={onCancel}
          ref={cancelRef}
          type="button"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function RemoveEvidence({
  evidence,
  review,
}: {
  evidence: SessionEvidence;
  review: ReviewHandle;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  if (isConfirming) {
    return (
      <RemoveConfirmation
        evidence={evidence}
        onCancel={() => setIsConfirming(false)}
        review={review}
      />
    );
  }
  return (
    <button
      aria-label={`Remove screenshot at ${formatClock(evidence.atMs)}`}
      className="dt-ses-link"
      onClick={() => setIsConfirming(true)}
      type="button"
    >
      Remove
    </button>
  );
}
