import { useState } from "react";
import type { SessionDetail, SessionEvidence } from "../../../protocol";
import { formatClock } from "../../session-format";
import { nearestSegmentId } from "../moment/moment-labels";
import type { ShowMoment } from "../proposals/proposal-details";
import type { ReviewHandle } from "../use-session-detail";
import { AttachLink } from "./attach-link";
import { EvidenceThumb, evidenceCaption, ShotCaption } from "./evidence-thumb";
import {
  type EvidenceRemoval,
  RemoveEvidence,
  useFocusWhen,
} from "./remove-evidence";

const isViewable = (evidence: SessionEvidence): boolean =>
  evidence.status === "available" && Boolean(evidence.image?.url);

function MissingEvidenceItem({
  caption,
  evidence,
  isJustRemoved,
}: {
  caption: string;
  evidence: SessionEvidence;
  isJustRemoved: boolean;
}) {
  const cardRef = useFocusWhen<HTMLLIElement>(isJustRemoved);
  return (
    <li
      className="dt-card"
      ref={cardRef}
      tabIndex={isJustRemoved ? -1 : undefined}
    >
      <p className="dt-meta">{caption}</p>
      <p className="dt-meta">
        Screenshot missing: {evidence.missingReason ?? "not captured."}
      </p>
    </li>
  );
}

function LinkEvidenceItem({
  link,
}: {
  link: NonNullable<SessionEvidence["link"]>;
}) {
  return (
    <li className="dt-card">
      <a
        className="dt-source"
        href={link.url}
        rel="noopener noreferrer"
        target="_blank"
      >
        {link.label}
      </a>
      <p className="dt-meta">{link.url}</p>
      {link.access && <p className="dt-meta">Who can open it: {link.access}</p>}
    </li>
  );
}

function EvidenceFace({ evidence }: { evidence: SessionEvidence }) {
  return (
    <>
      <ShotCaption atMs={evidence.atMs}>
        {evidenceCaption(evidence)}
      </ShotCaption>
      <EvidenceThumb evidence={evidence} isLarge />
    </>
  );
}

function EvidenceItem({
  evidence,
  onShowMoment,
  removal,
}: {
  evidence: SessionEvidence;
  onShowMoment: ((opener: HTMLElement) => void) | null;
  removal: EvidenceRemoval;
}) {
  const caption = `${formatClock(evidence.atMs)} · ${evidenceCaption(evidence)}`;
  if (evidence.link) {
    return <LinkEvidenceItem link={evidence.link} />;
  }
  if (!isViewable(evidence)) {
    return (
      <MissingEvidenceItem
        caption={caption}
        evidence={evidence}
        isJustRemoved={evidence.id === removal.removedId}
      />
    );
  }
  return (
    <li className="dt-card dt-openable">
      {onShowMoment ? (
        <button
          aria-label={`Show the moment at ${caption}`}
          className="dt-open dt-ses-shot-face"
          onClick={(event) => onShowMoment(event.currentTarget)}
          type="button"
        >
          <EvidenceFace evidence={evidence} />
        </button>
      ) : (
        <div className="dt-ses-shot-face">
          <EvidenceFace evidence={evidence} />
        </div>
      )}
      {evidence.note && <p className="dt-note-text">{evidence.note}</p>}
      {removal.canRemove && (
        <RemoveEvidence evidence={evidence} removal={removal} />
      )}
    </li>
  );
}

function AttachLinkAction({
  detail,
  review,
}: {
  detail: SessionDetail;
  review: ReviewHandle;
}) {
  const [isAttaching, setIsAttaching] = useState(false);
  if (isAttaching) {
    return (
      <AttachLink
        detail={detail}
        onDone={() => setIsAttaching(false)}
        review={review}
      />
    );
  }
  return (
    <div className="dt-actions">
      <button
        className="dt-btn"
        onClick={() => setIsAttaching(true)}
        type="button"
      >
        Attach a link
      </button>
    </div>
  );
}

export function EvidenceTab({
  detail,
  onShowMoment,
  review,
}: {
  detail: SessionDetail;
  onShowMoment: ShowMoment;
  review: ReviewHandle;
}) {
  const [removedId, setRemovedId] = useState<string | null>(null);
  const { canEdit } = detail.session;
  const removal: EvidenceRemoval = {
    canRemove: canEdit,
    onRemoved: setRemovedId,
    removedId,
    review,
  };
  const momentOpener = (atMs: number) => {
    const segmentId = nearestSegmentId(detail.segments, atMs);
    return segmentId
      ? (opener: HTMLElement) => onShowMoment(segmentId, opener)
      : null;
  };
  const attachLink = canEdit && (
    <AttachLinkAction detail={detail} review={review} />
  );

  if (detail.evidence.length === 0) {
    return (
      <div className="dt-empty">
        <p>No screenshots or links in this session.</p>
        {attachLink}
      </div>
    );
  }
  return (
    <>
      <ul className="dt-ses-rows">
        {detail.evidence.map((item) => (
          <EvidenceItem
            evidence={item}
            key={item.id}
            onShowMoment={momentOpener(item.atMs)}
            removal={removal}
          />
        ))}
      </ul>
      {attachLink}
    </>
  );
}
