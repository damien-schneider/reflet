import type { SessionDetail } from "../../../protocol";
import { formatClock } from "../../session-format";
import { EvidenceThumb } from "../transcript/evidence-thumb";

export interface SharedExtracts {
  evidenceIds: string[];
  segmentIds: string[];
}

export interface ShareConfirmation {
  isBusy: boolean;
  label: string;
  onCancel: () => void;
  onConfirm: () => void;
}

function ExtractList({
  detail,
  extracts,
}: {
  detail: SessionDetail;
  extracts: SharedExtracts;
}) {
  const segmentIds = new Set(extracts.segmentIds);
  const evidenceIds = new Set(extracts.evidenceIds);
  const quotes = detail.segments.filter((segment) =>
    segmentIds.has(segment.id)
  );
  const screenshots = detail.evidence.filter(
    (item) => evidenceIds.has(item.id) && item.status === "available"
  );
  if (quotes.length + screenshots.length === 0) {
    return (
      <p>
        No quote or screenshot from this private session becomes visible to your
        team.
      </p>
    );
  }
  return (
    <>
      <p>
        These extracts from this private session become visible to your team:
      </p>
      <ul className="dt-ses-list">
        {quotes.map((segment) => (
          <li key={segment.id}>
            <span className="dt-ses-time">{formatClock(segment.startMs)}</span>
            {` “${segment.text}”`}
          </li>
        ))}
      </ul>
      <div className="dt-ses-thumbs">
        {screenshots.map((item) => (
          <EvidenceThumb evidence={item} key={item.id} />
        ))}
      </div>
    </>
  );
}

export function SharePreview({
  confirmation,
  detail,
  extracts,
}: {
  confirmation: ShareConfirmation;
  detail: SessionDetail;
  extracts: SharedExtracts;
}) {
  return (
    <div className="dt-ses-banner">
      <ExtractList detail={detail} extracts={extracts} />
      <div className="dt-actions">
        <button
          className="dt-btn"
          data-variant="primary"
          disabled={confirmation.isBusy}
          onClick={confirmation.onConfirm}
          type="button"
        >
          {confirmation.label}
        </button>
        <button
          className="dt-btn"
          onClick={confirmation.onCancel}
          type="button"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
