import type { SessionProposal } from "../../../protocol";
import { attributedText, formatClock } from "../../session-format";
import type { ProposalContext } from "../proposals/proposal-details";
import { contextLine } from "./moment-labels";

export function IntentionSource({
  context,
  proposal,
}: {
  context: ProposalContext;
  proposal: SessionProposal;
}) {
  const { segments } = context.detail;
  const firstSegmentId = proposal.segmentIds.find((segmentId) =>
    segments.some((segment) => segment.id === segmentId)
  );
  const segment = segments.find((item) => item.id === firstSegmentId);
  if (!segment) {
    return null;
  }
  const [firstContext] = segment.context;
  const range = `${formatClock(segment.startMs)}–${formatClock(segment.endMs)}`;
  return (
    <button
      className="dt-ses-source-btn"
      onClick={(event) =>
        context.navigation.onShowMoment(segment.id, event.currentTarget)
      }
      title="Show the moment"
      type="button"
    >
      <span className="dt-ses-source">
        <span className="dt-ses-time">{range}</span> “{attributedText(segment)}”
      </span>
      {firstContext && (
        <span className="dt-meta">{contextLine(firstContext)}</span>
      )}
    </button>
  );
}
