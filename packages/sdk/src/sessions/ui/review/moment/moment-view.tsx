import { useEffect, useLayoutEffect, useRef } from "react";
import type {
  SegmentContext,
  SessionDetail,
  SessionSegment,
} from "../../../protocol";
import { attributedText, formatClock } from "../../session-format";
import { useFocusWhen } from "../transcript/remove-evidence";
import { gapLabel } from "../transcript/timeline";
import type { ReviewHandle } from "../use-session-detail";
import { ContextCorrection } from "./context-correction";
import { ContextLine } from "./context-line";
import { contextKindLabel, gapsDuring, ORIGIN_LABELS } from "./moment-labels";
import { MomentScreenshot } from "./moment-screenshot";

const AMBIGUOUS_COPY =
  "Several things happened around this passage. Reflet linked the closest one: check it, or change it.";

export interface MomentHandlers {
  onClose: () => void;
  onOpenIntention: (proposalId: string) => void;
  onShowMoment: (segmentId: string) => void;
}

function ContextItem({
  detail,
  item,
}: {
  detail: SessionDetail;
  item: SegmentContext;
}) {
  const evidence =
    detail.evidence.find((candidate) => candidate.id === item.evidenceId) ??
    null;
  return (
    <li className="dt-ses-moment-item">
      <p className="dt-ses-moment-line">
        <span className="dt-chip">{contextKindLabel(item)}</span>
        <span>
          <ContextLine item={item} />
        </span>
      </p>
      {item.evidenceId && <MomentScreenshot evidence={evidence} item={item} />}
    </li>
  );
}

function MomentContext({
  detail,
  segment,
}: {
  detail: SessionDetail;
  segment: SessionSegment;
}) {
  const hasScreenshot = segment.context.some((item) => item.evidenceId);
  const isAmbiguous =
    segment.contextAmbiguous && segment.contextOrigin === "auto";
  return (
    <section className="dt-ses-moment-section">
      <h4 className="dt-ses-label">On the page</h4>
      <div className="dt-ses-chips">
        <span className="dt-chip">{ORIGIN_LABELS[segment.contextOrigin]}</span>
      </div>
      {isAmbiguous && <p className="dt-meta">{AMBIGUOUS_COPY}</p>}
      {segment.context.length === 0 && (
        <p className="dt-meta">
          Nothing on the page is linked to this passage.
        </p>
      )}
      <ul className="dt-ses-rows">
        {segment.context.map((item) => (
          <ContextItem
            detail={detail}
            item={item}
            key={`${item.kind}:${item.atMs}:${item.label}`}
          />
        ))}
      </ul>
      {!hasScreenshot && (
        <p className="dt-meta">No screenshot at this moment</p>
      )}
    </section>
  );
}

function MomentNotices({
  detail,
  segment,
}: {
  detail: SessionDetail;
  segment: SessionSegment;
}) {
  const gaps = gapsDuring(detail.session.gaps, segment);
  const hasPageChange = segment.context.some(
    (item) => item.kind === "navigation"
  );
  if (gaps.length === 0 && !hasPageChange) {
    return null;
  }
  return (
    <ul className="dt-ses-list dt-ses-moment-notices">
      {gaps.map((gap) => (
        <li key={gap.startMs}>
          {gapLabel(gap)} during this passage: part of what happened was not
          recorded.
        </li>
      ))}
      {hasPageChange && <li>The page changed during this passage.</li>}
    </ul>
  );
}

function CitingIntentions({
  detail,
  onOpenIntention,
  segmentId,
}: {
  detail: SessionDetail;
  onOpenIntention: (proposalId: string) => void;
  segmentId: string;
}) {
  const citing = detail.proposals.filter(
    (proposal) =>
      proposal.mergedIntoId === null && proposal.segmentIds.includes(segmentId)
  );
  if (citing.length === 0) {
    return null;
  }
  return (
    <section className="dt-ses-moment-section">
      <h4 className="dt-ses-label">Intentions citing this passage</h4>
      <ul className="dt-ses-rows">
        {citing.map((proposal) => (
          <li key={proposal.id}>
            <button
              className="dt-ses-row"
              onClick={() => onOpenIntention(proposal.id)}
              type="button"
            >
              {proposal.need}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MomentSteps({
  detail,
  onShowMoment,
  segmentId,
}: {
  detail: SessionDetail;
  onShowMoment: (segmentId: string) => void;
  segmentId: string;
}) {
  const ordered = [...detail.segments].sort((a, b) => a.startMs - b.startMs);
  const index = ordered.findIndex((segment) => segment.id === segmentId);
  const previous = ordered[index - 1];
  const next = ordered[index + 1];
  return (
    <nav aria-label="Moments" className="dt-actions">
      <button
        className="dt-btn"
        disabled={!previous}
        onClick={() => previous && onShowMoment(previous.id)}
        type="button"
      >
        Previous moment
      </button>
      <button
        className="dt-btn"
        disabled={!next}
        onClick={() => next && onShowMoment(next.id)}
        type="button"
      >
        Next moment
      </button>
    </nav>
  );
}

function MomentHeading({
  onClose,
  segment,
}: {
  onClose: () => void;
  segment: SessionSegment | null;
}) {
  const headingRef = useFocusWhen<HTMLHeadingElement>(true);
  const range = segment
    ? `${formatClock(segment.startMs)}–${formatClock(segment.endMs)}`
    : "";
  return (
    <div className="dt-card-head">
      <h3 className="dt-ses-title" ref={headingRef} tabIndex={-1}>
        {segment ? `Moment ${range}` : "Moment"}
      </h3>
      <button className="dt-btn" onClick={onClose} type="button">
        Close
      </button>
    </div>
  );
}

function useEscapeToClose(onClose: () => void) {
  const sectionRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    const section = sectionRef.current;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
      }
    };
    section?.addEventListener("keydown", closeOnEscape);
    return () => section?.removeEventListener("keydown", closeOnEscape);
  }, []);
  return sectionRef;
}

export interface MomentSession {
  detail: SessionDetail;
  review: ReviewHandle;
}

export function MomentView({
  handlers,
  segmentId,
  session,
}: {
  handlers: MomentHandlers;
  segmentId: string;
  session: MomentSession;
}) {
  const { detail, review } = session;
  const segment = detail.segments.find((item) => item.id === segmentId);
  const sectionRef = useEscapeToClose(handlers.onClose);
  return (
    <section aria-label="Moment" className="dt-ses-moment" ref={sectionRef}>
      <MomentHeading
        key={segmentId}
        onClose={handlers.onClose}
        segment={segment ?? null}
      />
      {segment ? (
        <>
          <blockquote className="dt-ses-moment-quote">
            {attributedText(segment) || "No speech was heard here."}
          </blockquote>
          <MomentContext detail={detail} segment={segment} />
          <MomentNotices detail={detail} segment={segment} />
          <CitingIntentions
            detail={detail}
            onOpenIntention={handlers.onOpenIntention}
            segmentId={segment.id}
          />
          {detail.session.canEdit && (
            <ContextCorrection review={review} segment={segment} />
          )}
        </>
      ) : (
        <p className="dt-meta">This passage is no longer in the session.</p>
      )}
      <MomentSteps
        detail={detail}
        onShowMoment={handlers.onShowMoment}
        segmentId={segmentId}
      />
    </section>
  );
}
