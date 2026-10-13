import type { SessionProposal } from "../../../protocol";
import { formatClock } from "../../session-format";
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
    <section className="dt-ses-block">
      <p className="dt-ses-source">
        <span className="dt-ses-time">{range}</span> “{segment.text}”
      </p>
      {firstContext && <p className="dt-meta">{contextLine(firstContext)}</p>}
      <button
        className="dt-ses-link"
        onClick={(event) =>
          context.navigation.onShowMoment(segment.id, event.currentTarget)
        }
        type="button"
      >
        Show context
      </button>
    </section>
  );
}
