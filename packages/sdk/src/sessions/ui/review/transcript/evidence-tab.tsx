import { useState } from "react";
import type { SessionDetail, SessionEvidence } from "../../../protocol";
import { formatClock } from "../../session-format";
import type { ReviewHandle } from "../use-session-detail";
import { AttachLink } from "./attach-link";
import { EvidenceThumb, evidenceCaption } from "./evidence-thumb";
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
      <MissingEvidenceItem
        caption={caption}
        evidence={evidence}
        isJustRemoved={evidence.id === removal.removedId}
      />
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
        <RemoveEvidence evidence={evidence} removal={removal} />
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
        <RemoveEvidence evidence={evidence} removal={removal} />
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
  review,
}: {
  detail: SessionDetail;
  review: ReviewHandle;
}) {
  const [enlargedId, setEnlargedId] = useState<string | null>(null);
  const [removedId, setRemovedId] = useState<string | null>(null);
  const enlarged = detail.evidence.find(
    (item) => item.id === enlargedId && isViewable(item)
  );
  const removal: EvidenceRemoval = {
    canRemove: detail.session.canEdit,
    onRemoved: (evidenceId) => {
      setEnlargedId(null);
      setRemovedId(evidenceId);
    },
    removedId,
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
      {detail.session.canEdit && (
        <AttachLinkAction detail={detail} review={review} />
      )}
    </>
  );
}
