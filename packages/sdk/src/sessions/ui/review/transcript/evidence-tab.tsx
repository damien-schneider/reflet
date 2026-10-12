import { useState } from "react";
import type { SessionDetail, SessionEvidence } from "../../../protocol";
import { formatClock } from "../../session-format";
import type { ReviewHandle } from "../use-session-detail";
import { AttachLink } from "./attach-link";
import { EvidenceThumb, evidenceCaption } from "./evidence-thumb";

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
}: {
  evidence: SessionEvidence;
  onEnlarge: () => void;
}) {
  const caption = `${formatClock(evidence.atMs)} · ${evidenceCaption(evidence)}`;
  if (evidence.link) {
    return <LinkEvidenceItem link={evidence.link} />;
  }
  if (evidence.status === "missing" || !evidence.image?.url) {
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
    </li>
  );
}

function EnlargedEvidence({
  evidence,
  onBack,
}: {
  evidence: SessionEvidence;
  onBack: () => void;
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
    </>
  );
}

function EvidenceList({
  evidence,
  onEnlarge,
}: {
  evidence: SessionEvidence[];
  onEnlarge: (evidenceId: string) => void;
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
  const enlarged = detail.evidence.find((item) => item.id === enlargedId);

  if (enlarged) {
    return (
      <EnlargedEvidence
        evidence={enlarged}
        onBack={() => setEnlargedId(null)}
      />
    );
  }
  return (
    <>
      <EvidenceList evidence={detail.evidence} onEnlarge={setEnlargedId} />
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
