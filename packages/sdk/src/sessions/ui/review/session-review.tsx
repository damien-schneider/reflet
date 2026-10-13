import { useState } from "react";
import { flushSync } from "react-dom";
import type { SessionDetail } from "../../protocol";
import { HandoffView } from "../handoff/handoff-view";
import { ContinuationHeader } from "./continuation/update-card";
import { MomentView } from "./moment/moment-view";
import type { ProposalContext, ShowMoment } from "./proposals/proposal-details";
import { ProposalsTab } from "./proposals/proposals-tab";
import { useProposalActions } from "./proposals/use-proposal-actions";
import { ReviewHeader } from "./review-header";
import { StatusStrip } from "./status-strip";
import { EvidenceTab } from "./transcript/evidence-tab";
import { TranscriptTab } from "./transcript/transcript-tab";
import { type ReviewHandle, useSessionDetail } from "./use-session-detail";

type ReviewTab = "evidence" | "proposals" | "transcript";

interface OpenMoment {
  opener: HTMLElement | null;
  segmentId: string;
}

function HandoffFooter({
  detail,
  onHandOff,
}: {
  detail: SessionDetail;
  onHandOff: () => void;
}) {
  const confirmed = detail.proposals.filter(
    (proposal) => proposal.decision === "kept" && proposal.mergedIntoId === null
  ).length;
  return (
    <div className="dt-sheet-foot">
      <button
        aria-describedby={confirmed === 0 ? "rf-handoff-hint" : undefined}
        className="dt-btn"
        data-variant="primary"
        disabled={confirmed === 0}
        onClick={onHandOff}
        type="button"
      >
        {confirmed === 0 ? "Hand off" : `Hand off ${confirmed} confirmed`}
      </button>
      {confirmed === 0 && (
        <span className="dt-status" id="rf-handoff-hint">
          Confirm an intention to hand it off
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
  const intentionCount = detail.proposals.filter(
    (proposal) => proposal.mergedIntoId === null && proposal.attachment === null
  ).length;
  const options: { label: string; value: ReviewTab }[] = [
    { label: `Intentions (${intentionCount})`, value: "proposals" },
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
  tab,
}: {
  context: ProposalContext;
  tab: ReviewTab;
}) {
  const { detail, navigation, review } = context;
  if (tab === "proposals") {
    return <ProposalsTab context={context} />;
  }
  if (tab === "transcript") {
    return (
      <TranscriptTab
        detail={detail}
        onShowMoment={navigation.onShowMoment}
        review={review}
      />
    );
  }
  return (
    <EvidenceTab
      detail={detail}
      onShowMoment={navigation.onShowMoment}
      review={review}
    />
  );
}

interface ReviewPlace {
  closeMoment: (shouldReturnFocus: boolean) => void;
  focusIntentionId: string | null;
  moment: OpenMoment | null;
  openIntention: (proposalId: string) => void;
  selectTab: (tab: ReviewTab) => void;
  showMoment: ShowMoment;
  tab: ReviewTab;
}

function useReviewPlace(): ReviewPlace {
  const [tab, setTab] = useState<ReviewTab>("proposals");
  const [focusIntentionId, setFocusIntentionId] = useState<string | null>(null);
  const [moment, setMoment] = useState<OpenMoment | null>(null);

  const closeMoment = (shouldReturnFocus: boolean) => {
    const opener = moment?.opener;
    flushSync(() => setMoment(null));
    if (shouldReturnFocus && opener?.isConnected) {
      opener.focus();
    }
  };
  const showMoment: ShowMoment = (segmentId, opener) => {
    setFocusIntentionId(null);
    setMoment((current) => ({
      opener: opener ?? current?.opener ?? null,
      segmentId,
    }));
  };
  return {
    closeMoment,
    focusIntentionId,
    moment,
    openIntention: (proposalId: string) => {
      closeMoment(false);
      setTab("proposals");
      setFocusIntentionId(proposalId);
    },
    selectTab: (next: ReviewTab) => {
      closeMoment(false);
      setTab(next);
    },
    showMoment,
    tab,
  };
}

export interface ReviewLinks {
  onBack: () => void;
  onOpenSession: (sessionId: string) => void;
  onStarted: () => void;
}

function ReviewPanels({
  context,
  place,
}: {
  context: ProposalContext;
  place: ReviewPlace;
}) {
  const { detail, review } = context;
  return (
    <>
      <ReviewTabs detail={detail} onSelect={place.selectTab} tab={place.tab} />
      <div className="dt-ses-panel" hidden={place.moment !== null}>
        <ReviewTabPanel context={context} tab={place.tab} />
      </div>
      {place.moment && (
        <MomentView
          handlers={{
            onClose: () => place.closeMoment(true),
            onOpenIntention: place.openIntention,
            onShowMoment: (segmentId) => place.showMoment(segmentId),
          }}
          segmentId={place.moment.segmentId}
          session={{ detail, review }}
        />
      )}
    </>
  );
}

function ReviewTop({
  context,
  links,
}: {
  context: ProposalContext;
  links: ReviewLinks;
}) {
  const { detail, review } = context;
  return (
    <>
      <ReviewHeader
        onBack={links.onBack}
        review={review}
        session={detail.session}
      />
      <StatusStrip detail={detail} review={review} />
      {detail.continuation && (
        <ContinuationHeader
          continuation={detail.continuation}
          onOpenSession={links.onOpenSession}
        />
      )}
    </>
  );
}

function ReviewScreen({
  detail,
  links,
  review,
}: {
  detail: SessionDetail;
  links: ReviewLinks;
  review: ReviewHandle;
}) {
  const place = useReviewPlace();
  const [isHandingOff, setIsHandingOff] = useState(false);
  const context: ProposalContext = {
    actions: useProposalActions(review),
    canEdit: detail.session.canEdit,
    detail,
    focusIntentionId: place.focusIntentionId,
    navigation: {
      onOpenSession: links.onOpenSession,
      onShowMoment: place.showMoment,
      onStarted: links.onStarted,
    },
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
      <ReviewTop context={context} links={links} />
      <ReviewPanels context={context} place={place} />
      {context.canEdit && (
        <HandoffFooter
          detail={detail}
          onHandOff={() => setIsHandingOff(true)}
        />
      )}
    </>
  );
}

export function SessionReview({
  links,
  sessionId,
}: {
  links: ReviewLinks;
  sessionId: string;
}) {
  const handle = useSessionDetail(sessionId);
  const { state } = handle;
  if (state.kind === "loading") {
    return <p className="dt-status">Loading the session…</p>;
  }
  if (state.kind === "ready") {
    return <ReviewScreen detail={state.detail} links={links} review={handle} />;
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
        <button className="dt-btn" onClick={links.onBack} type="button">
          All sessions
        </button>
      </div>
    </div>
  );
}
