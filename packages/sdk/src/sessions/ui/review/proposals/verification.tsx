import { useState } from "react";
import type { SessionProposal } from "../../../protocol";
import type { ProposalContext } from "./proposal-details";

const OUTCOME_LABELS = {
  needs_work: "Needs more work",
  works: "Works",
} as const;

export function Verification({
  context,
  proposal,
}: {
  context: ProposalContext;
  proposal: SessionProposal;
}) {
  const [note, setNote] = useState(proposal.verification?.note ?? "");
  if (proposal.handedOffRevision === null) {
    return null;
  }
  const { verification } = proposal;
  return (
    <fieldset className="dt-ses-verify">
      <legend className="dt-ses-label">Did the change work?</legend>
      {verification && (
        <p className="dt-meta">
          Checked: {OUTCOME_LABELS[verification.status]}
          {verification.note ? ` · ${verification.note}` : ""}
        </p>
      )}
      <input
        aria-label="Note about the change (optional)"
        className="dt-field"
        maxLength={1000}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Note (optional)"
        value={note}
      />
      <div className="dt-actions">
        {(["works", "needs_work"] as const).map((status) => (
          <button
            aria-pressed={verification?.status === status}
            className="dt-btn"
            key={status}
            onClick={() =>
              context.actions.verify(proposal.id, { note: note.trim(), status })
            }
            type="button"
          >
            {OUTCOME_LABELS[status]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
