import { keptProposals } from "../handoff/handoff-selection";
import { useSessionWorkspace } from "../session-workspace";
import type { ProposalContext } from "./proposals/proposal-details";

const NOTHING_CONFIRMED = "Confirm an intention first";
const NO_OWN_CONNECTION =
  "Adding to a board needs this app's own Reflet connection";

function boardBlocker(
  canAddToBoard: boolean,
  counts: { confirmed: number; offBoard: number }
): string | null {
  if (!canAddToBoard) {
    return NO_OWN_CONNECTION;
  }
  if (counts.confirmed === 0) {
    return NOTHING_CONFIRMED;
  }
  return counts.offBoard === 0
    ? "Every confirmed intention is on the board"
    : null;
}

export function ReviewFooter({
  context,
  onOpenBrief,
}: {
  context: ProposalContext;
  onOpenBrief: () => void;
}) {
  const { canAddToBoard } = useSessionWorkspace();
  const confirmed = keptProposals(context.detail);
  const offBoard = confirmed.filter((proposal) => proposal.feedbackId === null);
  const hasConfirmed = confirmed.length > 0;
  const blocker = boardBlocker(canAddToBoard, {
    confirmed: confirmed.length,
    offBoard: offBoard.length,
  });
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
        disabled={blocker !== null}
        onClick={() => context.actions.addToBoard(offBoard)}
        title={blocker ?? undefined}
        type="button"
      >
        Add to board
        {blocker === null && (
          <span className="dt-btn-count">{offBoard.length}</span>
        )}
      </button>
    </div>
  );
}
