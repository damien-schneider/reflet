import { useEffect, useRef, useState } from "react";
import { announce } from "../../../../devtools/client/notices";
import { TrashIcon } from "../../../../feedback/ui/icons";
import type { SessionEvidence } from "../../../protocol";
import { formatClock } from "../../session-format";
import { useSessionAction, useSessionWorkspace } from "../../session-workspace";
import { type ReviewHandle, withEvidence } from "../use-session-detail";

const REMOVE_COPY =
  "Remove this screenshot? The image is deleted for good. Briefs you already downloaded keep their copy.";

export interface EvidenceRemoval {
  canRemove: boolean;
  onRemoved: (evidenceId: string) => void;
  removedId: string | null;
  review: ReviewHandle;
}

export function useFocusWhen<T extends HTMLElement>(shouldFocus: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (shouldFocus) {
      ref.current?.focus();
    }
  }, [shouldFocus]);
  return ref;
}

function RemoveConfirmation({
  evidence,
  onCancel,
  removal,
}: {
  evidence: SessionEvidence;
  onCancel: () => void;
  removal: EvidenceRemoval;
}) {
  const { api } = useSessionWorkspace();
  const run = useSessionAction();
  const cancelRef = useFocusWhen<HTMLButtonElement>(true);

  const remove = async () => {
    const removed = await run("The screenshot was not removed", () =>
      api.removeEvidence(evidence.id)
    );
    if (removed !== null) {
      removal.review.patch((detail) => withEvidence(detail, removed));
      removal.review.reload();
      removal.onRemoved(removed.id);
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
  removal,
}: {
  evidence: SessionEvidence;
  removal: EvidenceRemoval;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [hasCancelled, setHasCancelled] = useState(false);
  const triggerRef = useFocusWhen<HTMLButtonElement>(hasCancelled);
  if (isConfirming) {
    return (
      <RemoveConfirmation
        evidence={evidence}
        onCancel={() => {
          setIsConfirming(false);
          setHasCancelled(true);
        }}
        removal={removal}
      />
    );
  }
  const label = `Remove screenshot at ${formatClock(evidence.atMs)}`;
  return (
    <button
      aria-label={label}
      className="icon-btn glass dt-ses-hover-action"
      onClick={() => {
        setIsConfirming(true);
        setHasCancelled(false);
      }}
      ref={triggerRef}
      title={label}
      type="button"
    >
      <TrashIcon />
    </button>
  );
}
