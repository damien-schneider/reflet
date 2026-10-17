import { keptProposals } from "../handoff/handoff-selection";
import type { ProposalContext } from "./proposals/proposal-details";

const NOTHING_CONFIRMED = "Confirm an intention first";

export function ReviewFooter({
  context,
  onOpenBrief,
}: {
  context: ProposalContext;
  onOpenBrief: () => void;
}) {
  const confirmed = keptProposals(context.detail);
  const offBoard = confirmed.filter((proposal) => proposal.feedbackId === null);
  const hasConfirmed = confirmed.length > 0;
  const boardBlocker = hasConfirmed
    ? "Every confirmed intention is on the board"
    : NOTHING_CONFIRMED;
  return (
    <div className="dt-sheet-foot dt-ses-foot">
      <button
        className="dt-btn"
        data-variant="primary"
        disabled={!hasConfirmed}
        onClick={onOpenBrief}
        title={hasConfirmed ? undefined : NOTHING_CONFIRMED}
        type="button"
      >
        Prepare brief
        {hasConfirmed && (
          <span className="dt-btn-count">{confirmed.length}</span>
        )}
      </button>
      <button
        className="dt-btn"
        disabled={offBoard.length === 0}
        onClick={() => context.actions.addToBoard(offBoard)}
        title={offBoard.length === 0 ? boardBlocker : undefined}
        type="button"
      >
        Add to board
        {offBoard.length > 0 && (
          <span className="dt-btn-count">{offBoard.length}</span>
        )}
      </button>
    </div>
  );
}
