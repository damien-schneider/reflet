import { useState } from "react";
import type { SessionDetail } from "../../../protocol";
import { isAnalysisBusy } from "../../session-format";
import { ProposalCard } from "./proposal-card";
import type { ProposalContext } from "./proposal-details";
import { FormActions, TextField } from "./proposal-editor";

function emptyCopy(detail: SessionDetail): string {
  const { session } = detail;
  if (session.collection !== "ended") {
    return "Proposals appear here once the recording has uploaded and Reflet has read it.";
  }
  if (detail.segments.length === 0 && detail.marks.length === 0) {
    return "Nothing was said or marked in this session.";
  }
  if (isAnalysisBusy(session)) {
    return "Proposals appear here once Reflet has read the session.";
  }
  if (session.analysis.state === "failed") {
    return "The transcript is kept. Read it, or write the proposal yourself.";
  }
  if (session.analysis.state === "succeeded") {
    return "No request stood out in this session. Read the transcript or write the proposal yourself.";
  }
  return "Proposals appear here once the session is analyzed.";
}

function useAddProposal(context: ProposalContext, onDone: () => void) {
  const [need, setNeed] = useState("");
  const [observed, setObserved] = useState("");
  const [clientKey] = useState(() => crypto.randomUUID());
  const [isSaving, setIsSaving] = useState(false);
  const sessionId = context.detail.session.id;

  const add = async () => {
    setIsSaving(true);
    try {
      const created = await context.actions.save(
        "The proposal was not added",
        (api) =>
          api.createProposal({
            clientKey,
            need: need.trim(),
            observed: observed.trim() || undefined,
            sessionId,
          })
      );
      if (created) {
        onDone();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return { add, isSaving, need, observed, setNeed, setObserved };
}

function AddProposalForm({
  context,
  onDone,
}: {
  context: ProposalContext;
  onDone: () => void;
}) {
  const { add, isSaving, need, observed, setNeed, setObserved } =
    useAddProposal(context, onDone);

  return (
    <form
      className="dt-card dt-ses-form"
      onSubmit={(event) => {
        event.preventDefault();
        add();
      }}
    >
      <TextField
        label="Need"
        maxLength={300}
        onChange={setNeed}
        rows={2}
        value={need}
      />
      <TextField
        label="What you observed (optional)"
        maxLength={2000}
        onChange={setObserved}
        rows={3}
        value={observed}
      />
      <FormActions
        isSubmitDisabled={isSaving || need.trim() === ""}
        onCancel={onDone}
        submitLabel="Add proposal"
      />
    </form>
  );
}

export function ProposalsTab({ context }: { context: ProposalContext }) {
  const [isAdding, setIsAdding] = useState(false);
  const proposals = context.detail.proposals.filter(
    (proposal) => proposal.mergedIntoId === null
  );
  return (
    <>
      {proposals.length === 0 && (
        <p className="dt-empty">{emptyCopy(context.detail)}</p>
      )}
      {proposals.map((proposal) => (
        <ProposalCard context={context} key={proposal.id} proposal={proposal} />
      ))}
      {context.canEdit &&
        (isAdding ? (
          <AddProposalForm
            context={context}
            onDone={() => setIsAdding(false)}
          />
        ) : (
          <div className="dt-actions">
            <button
              className="dt-btn"
              onClick={() => setIsAdding(true)}
              type="button"
            >
              Add a proposal
            </button>
          </div>
        ))}
    </>
  );
}
