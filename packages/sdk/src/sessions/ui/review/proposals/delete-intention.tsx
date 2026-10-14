import { useState } from "react";
import { announce } from "../../../../devtools/client/notices";
import type { SessionProposal } from "../../../protocol";
import { useSessionAction, useSessionWorkspace } from "../../session-workspace";
import { useFocusWhen } from "../transcript/remove-evidence";
import type { ProposalContext } from "./proposal-details";
import { quotedNeed } from "./use-proposal-actions";

const DELETE_INTENTION_COPY =
  "Delete this intention? What later sessions added to it goes too, and so do the briefs Reflet saved that include it. Briefs you already copied or downloaded keep their text.";

function DeleteConfirmation({
  context,
  onCancel,
  proposal,
}: {
  context: ProposalContext;
  onCancel: () => void;
  proposal: SessionProposal;
}) {
  const { api } = useSessionWorkspace();
  const run = useSessionAction();
  const remove = async () => {
    const deleted = await run("The intention was not deleted", () =>
      api.deleteProposal(proposal.id)
    );
    if (deleted !== null) {
      context.review.patch((detail) => ({
        ...detail,
        proposals: detail.proposals.filter((item) => item.id !== proposal.id),
      }));
      announce(`Deleted ${quotedNeed(proposal.need)}`);
    }
  };
  return (
    <div className="dt-ses-banner">
      <p>{DELETE_INTENTION_COPY}</p>
      <div className="dt-actions">
        <button
          className="dt-btn"
          data-variant="danger"
          onClick={remove}
          type="button"
        >
          Delete
        </button>
        <button className="dt-btn" onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function DeleteIntention({
  context,
  proposal,
}: {
  context: ProposalContext;
  proposal: SessionProposal;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [hasCancelled, setHasCancelled] = useState(false);
  const buttonRef = useFocusWhen<HTMLButtonElement>(
    hasCancelled && !isConfirming
  );
  if (isConfirming) {
    return (
      <DeleteConfirmation
        context={context}
        onCancel={() => {
          setIsConfirming(false);
          setHasCancelled(true);
        }}
        proposal={proposal}
      />
    );
  }
  return (
    <div className="dt-actions">
      <button
        className="dt-btn"
        data-variant="danger"
        onClick={() => {
          setIsConfirming(true);
          setHasCancelled(false);
        }}
        ref={buttonRef}
        type="button"
      >
        Delete intention
      </button>
    </div>
  );
}
