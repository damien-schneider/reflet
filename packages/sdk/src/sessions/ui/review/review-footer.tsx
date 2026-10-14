import { keptProposals } from "../handoff/handoff-selection";
import type { ProposalContext } from "./proposals/proposal-details";

export function ReviewFooter({
  context,
  onOpenBrief,
}: {
  context: ProposalContext;
  onOpenBrief: () => void;
}) {
  const confirmed = keptProposals(context.detail);
  const offBoard = confirmed.filter((proposal) => proposal.feedbackId === null);
  return (
    <div className="dt-sheet-foot">
      <button
        aria-describedby={confirmed.length === 0 ? "rf-brief-hint" : undefined}
        className="dt-btn"
        data-variant="primary"
        disabled={confirmed.length === 0}
        onClick={onOpenBrief}
        type="button"
      >
        Prepare brief
        {confirmed.length > 0 && (
          <span className="dt-btn-count">{confirmed.length}</span>
        )}
      </button>
      {offBoard.length > 0 && (
        <button
          className="dt-btn"
          onClick={() => context.actions.addToBoard(offBoard)}
          type="button"
        >
          Add {offBoard.length} to board
        </button>
      )}
      {confirmed.length === 0 && (
        <span className="dt-status" id="rf-brief-hint">
          Confirm an intention to brief your agent or add it to the board
        </span>
      )}
    </div>
  );
}
