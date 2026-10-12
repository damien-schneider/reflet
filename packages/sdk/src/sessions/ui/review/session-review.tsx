import { useState } from "react";
import type { SessionDetail } from "../../protocol";
import { HandoffView } from "../handoff/handoff-view";
import type { ProposalContext } from "./proposals/proposal-details";
import { ProposalsTab } from "./proposals/proposals-tab";
import { useProposalActions } from "./proposals/use-proposal-actions";
import { ReviewHeader } from "./review-header";
import { StatusStrip } from "./status-strip";
import { EvidenceTab } from "./transcript/evidence-tab";
import { TranscriptTab } from "./transcript/transcript-tab";
import { type ReviewHandle, useSessionDetail } from "./use-session-detail";

type ReviewTab = "evidence" | "proposals" | "transcript";

function HandoffFooter({
  detail,
  onHandOff,
}: {
  detail: SessionDetail;
  onHandOff: () => void;
}) {
  const kept = detail.proposals.filter(
    (proposal) => proposal.decision === "kept" && proposal.mergedIntoId === null
  ).length;
  return (
    <div className="dt-sheet-foot">
      <button
        aria-describedby={kept === 0 ? "rf-handoff-hint" : undefined}
        className="dt-btn"
        data-variant="primary"
        disabled={kept === 0}
        onClick={onHandOff}
        type="button"
      >
        {kept === 0 ? "Hand off" : `Hand off ${kept} kept`}
      </button>
      {kept === 0 && (
        <span className="dt-status" id="rf-handoff-hint">
          Keep a proposal to hand it off
        </span>
      )}
    </div>
  );
}

function ReviewTabs({
  detail,
  onSelect,
  tab,
}: {
  detail: SessionDetail;
  onSelect: (tab: ReviewTab) => void;
  tab: ReviewTab;
}) {
  const proposalCount = detail.proposals.filter(
    (proposal) => proposal.mergedIntoId === null
  ).length;
  const options: { label: string; value: ReviewTab }[] = [
    { label: `Proposals (${proposalCount})`, value: "proposals" },
    { label: "Transcript", value: "transcript" },
    { label: `Evidence (${detail.evidence.length})`, value: "evidence" },
  ];
  return (
    <div className="dt-tabs dt-ses-tabs">
      {options.map((option) => (
        <button
          aria-pressed={option.value === tab}
          className="dt-tab"
          key={option.value}
          onClick={() => onSelect(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ReviewTabPanel({
  context,
  focusSegmentId,
  tab,
}: {
  context: ProposalContext;
  focusSegmentId: string | null;
  tab: ReviewTab;
}) {
  const { detail, review } = context;
  if (tab === "proposals") {
    return <ProposalsTab context={context} />;
  }
  if (tab === "transcript") {
    return (
      <TranscriptTab
        detail={detail}
        focusSegmentId={focusSegmentId}
        review={review}
      />
    );
  }
  return <EvidenceTab detail={detail} review={review} />;
}

function useReviewTab() {
  const [tab, setTab] = useState<ReviewTab>("proposals");
  const [focusSegmentId, setFocusSegmentId] = useState<string | null>(null);
  const showSegment = (segmentId: string) => {
    setFocusSegmentId(segmentId);
    setTab("transcript");
  };
  return { focusSegmentId, setTab, showSegment, tab };
}

function ReviewScreen({
  detail,
  onBack,
  review,
}: {
  detail: SessionDetail;
  onBack: () => void;
  review: ReviewHandle;
}) {
  const { focusSegmentId, setTab, showSegment, tab } = useReviewTab();
  const [isHandingOff, setIsHandingOff] = useState(false);
  const actions = useProposalActions(review);
  const { canEdit } = detail.session;
  const context: ProposalContext = {
    actions,
    canEdit,
    detail,
    onShowSegment: showSegment,
    review,
  };

  if (isHandingOff) {
    return (
      <HandoffView
        detail={detail}
        onClose={() => setIsHandingOff(false)}
        review={review}
      />
    );
  }
  return (
    <>
      <ReviewHeader onBack={onBack} review={review} session={detail.session} />
      <StatusStrip detail={detail} review={review} />
      <ReviewTabs detail={detail} onSelect={setTab} tab={tab} />
      <ReviewTabPanel
        context={context}
        focusSegmentId={focusSegmentId}
        tab={tab}
      />
      {canEdit && (
        <HandoffFooter
          detail={detail}
          onHandOff={() => setIsHandingOff(true)}
        />
      )}
    </>
  );
}

export function SessionReview({
  onBack,
  sessionId,
}: {
  onBack: () => void;
  sessionId: string;
}) {
  const handle = useSessionDetail(sessionId);
  const { state } = handle;
  if (state.kind === "loading") {
    return <p className="dt-status">Loading the session…</p>;
  }
  if (state.kind === "ready") {
    return (
      <ReviewScreen detail={state.detail} onBack={onBack} review={handle} />
    );
  }
  return (
    <div className="dt-empty">
      <p>
        {state.kind === "missing"
          ? "This session is gone: it was deleted or is no longer shared with you."
          : `The session did not load: ${state.message}`}
      </p>
      <div className="dt-actions">
        {state.kind === "failed" && (
          <button className="dt-btn" onClick={handle.reload} type="button">
            Try again
          </button>
        )}
        <button className="dt-btn" onClick={onBack} type="button">
          All sessions
        </button>
      </div>
    </div>
  );
}
