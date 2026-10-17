import { CheckIcon } from "../../../../feedback/ui/icons";
import type { SessionDetail, SessionProposal } from "../../../protocol";
import { UpdateCard } from "../continuation/update-card";
import { ProcessingProgress, useProcessingSteps } from "../processing-progress";
import { calloutReport } from "../screens/callout-report";
import { ScreenReport } from "../screens/screen-report";
import { ProposalCard } from "./proposal-card";
import type { ProposalContext } from "./proposal-details";

export type IntentionView = "screens" | "cards";

function emptyCopy(detail: SessionDetail): string {
  if (detail.session.collection !== "ended") {
    return "Intentions appear here once the recording has uploaded and Reflet has read it.";
  }
  if (detail.segments.length === 0 && detail.marks.length === 0) {
    return "Nothing was said or marked in this session.";
  }
  return "No request stood out in this session.";
}

function ConfirmAll({
  context,
  undecided,
}: {
  context: ProposalContext;
  undecided: SessionProposal[];
}) {
  return (
    <div className="dt-actions">
      <button
        className="dt-btn"
        onClick={() => context.actions.decide(undecided, "kept")}
        type="button"
      >
        <CheckIcon size={14} />
        Confirm all
        <span className="dt-btn-count">{undecided.length}</span>
      </button>
    </div>
  );
}

export function ProposalsTab({
  context,
  view,
}: {
  context: ProposalContext;
  view: IntentionView;
}) {
  const { detail, review } = context;
  const steps = useProcessingSteps(detail);
  const isProcessing = steps.some((step) => step.state !== "done");
  const proposals = detail.proposals.filter(
    (proposal) => proposal.mergedIntoId === null
  );
  const undecided = proposals.filter(
    (proposal) =>
      proposal.decision === "pending" && proposal.attachment === null
  );
  const { continuation } = detail;
  const hasNothingToReview = proposals.length === 0 && !continuation;
  const report = calloutReport(detail);
  const showsScreens = report.screens.length > 0 && view === "screens";
  return (
    <>
      <ProcessingProgress
        detail={detail}
        fillsPanel={hasNothingToReview}
        isProcessing={isProcessing}
        review={review}
        steps={steps}
      />
      {continuation && (
        <UpdateCard context={context} continuation={continuation} />
      )}
      {hasNothingToReview && !isProcessing && (
        <p className="dt-empty">{emptyCopy(detail)}</p>
      )}
      {context.canEdit && undecided.length > 1 && (
        <ConfirmAll context={context} undecided={undecided} />
      )}
      {showsScreens && <ScreenReport context={context} report={report} />}
      {proposals
        .filter((proposal) => !showsScreens || proposal.attachment !== null)
        .map((proposal) => (
          <ProposalCard
            context={context}
            key={proposal.id}
            proposal={proposal}
          />
        ))}
    </>
  );
}
