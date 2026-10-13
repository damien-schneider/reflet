import { useState } from "react";
import type { SessionDetail, SessionEvidence } from "../../../protocol";
import { formatClock } from "../../session-format";
import type { ReviewHandle } from "../use-session-detail";
import { AttachLink } from "./attach-link";
import { EvidenceThumb, evidenceCaption } from "./evidence-thumb";
import { RemoveEvidence } from "./remove-evidence";

interface EvidenceRemoval {
  canRemove: boolean;
  review: ReviewHandle;
}

const isViewable = (evidence: SessionEvidence): boolean =>
  evidence.status === "available" && Boolean(evidence.image?.url);

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

function EvidenceItem({
  evidence,
  onEnlarge,
  removal,
}: {
  evidence: SessionEvidence;
  onEnlarge: () => void;
  removal: EvidenceRemoval;
}) {
  const caption = `${formatClock(evidence.atMs)} · ${evidenceCaption(evidence)}`;
  if (evidence.link) {
    return <LinkEvidenceItem link={evidence.link} />;
  }
  if (!isViewable(evidence)) {
    return (
      <li className="dt-card">
        <p className="dt-meta">{caption}</p>
        <p className="dt-meta">
          Screenshot missing: {evidence.missingReason ?? "not captured."}
        </p>
      </li>
    );
  }
  return (
    <li className="dt-card">
      <button
        aria-label={`Enlarge: ${caption}`}
        className="dt-ses-shot-btn"
        onClick={onEnlarge}
        type="button"
      >
        <EvidenceThumb evidence={evidence} />
      </button>
      <p className="dt-meta">{caption}</p>
      {evidence.note && <p className="dt-note-text">{evidence.note}</p>}
      {removal.canRemove && (
        <RemoveEvidence evidence={evidence} review={removal.review} />
      )}
    </li>
  );
}

function EnlargedEvidence({
  evidence,
  onBack,
  removal,
}: {
  evidence: SessionEvidence;
  onBack: () => void;
  removal: EvidenceRemoval;
}) {
  return (
    <>
      <button className="dt-ses-link" onClick={onBack} type="button">
        ← All evidence
      </button>
      <EvidenceThumb evidence={evidence} isLarge />
      <p className="dt-meta">
        {formatClock(evidence.atMs)} · {evidenceCaption(evidence)}
      </p>
      {removal.canRemove && (
        <RemoveEvidence evidence={evidence} review={removal.review} />
      )}
    </>
  );
}

function EvidenceList({
  evidence,
  onEnlarge,
  removal,
}: {
  evidence: SessionEvidence[];
  onEnlarge: (evidenceId: string) => void;
  removal: EvidenceRemoval;
}) {
  return (
    <>
      {evidence.length === 0 && (
        <p className="dt-empty">No screenshots or links in this session.</p>
      )}
      <ul className="dt-ses-rows">
        {evidence.map((item) => (
          <EvidenceItem
            evidence={item}
            key={item.id}
            onEnlarge={() => onEnlarge(item.id)}
            removal={removal}
          />
        ))}
      </ul>
    </>
  );
}

export function EvidenceTab({
  detail,
  review,
}: {
  detail: SessionDetail;
  review: ReviewHandle;
}) {
  const [enlargedId, setEnlargedId] = useState<string | null>(null);
  const [isAttaching, setIsAttaching] = useState(false);
  const enlarged = detail.evidence.find(
    (item) => item.id === enlargedId && isViewable(item)
  );
  const removal: EvidenceRemoval = {
    canRemove: detail.session.canEdit,
    review,
  };

  if (enlarged) {
    return (
      <EnlargedEvidence
        evidence={enlarged}
        onBack={() => setEnlargedId(null)}
        removal={removal}
      />
    );
  }
  return (
    <>
      <EvidenceList
        evidence={detail.evidence}
        onEnlarge={setEnlargedId}
        removal={removal}
      />
      {detail.session.canEdit &&
        (isAttaching ? (
          <AttachLink
            detail={detail}
            onDone={() => setIsAttaching(false)}
            review={review}
          />
        ) : (
          <div className="dt-actions">
            <button
              className="dt-btn"
              onClick={() => setIsAttaching(true)}
              type="button"
            >
              Attach a link
            </button>
          </div>
        ))}
    </>
  );
}
