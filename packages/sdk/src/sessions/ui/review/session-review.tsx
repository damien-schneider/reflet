import { useState } from "react";
import { flushSync } from "react-dom";
import type { SessionDetail } from "../../protocol";
import { HandoffView } from "../handoff/handoff-view";
import { ContinuationHeader } from "./continuation/update-card";
import { MomentView } from "./moment/moment-view";
import type { ProposalContext, ShowMoment } from "./proposals/proposal-details";
import { type IntentionView, ProposalsTab } from "./proposals/proposals-tab";
import { useProposalActions } from "./proposals/use-proposal-actions";
import { ReviewFooter } from "./review-footer";
import { ReviewHeader } from "./review-header";
import {
  type ReviewTab,
  ReviewTabs,
  type ReviewTabsPlace,
} from "./review-tabs";
import { StatusStrip } from "./status-strip";
import { EvidenceTab } from "./transcript/evidence-tab";
import { TranscriptTab } from "./transcript/transcript-tab";
import { type ReviewHandle, useSessionDetail } from "./use-session-detail";

interface OpenMoment {
  opener: HTMLElement | null;
  segmentId: string;
}

function ReviewTabPanel({
  context,
  place,
}: {
  context: ProposalContext;
  place: ReviewPlace;
}) {
  const { detail, navigation, review } = context;
  if (place.tab === "proposals") {
    return <ProposalsTab context={context} view={place.intentionView} />;
  }
  if (place.tab === "transcript") {
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

interface ReviewPlace extends ReviewTabsPlace {
  closeMoment: (shouldReturnFocus: boolean) => void;
  focusIntentionId: string | null;
  moment: OpenMoment | null;
  openIntention: (proposalId: string) => void;
  showMoment: ShowMoment;
  tab: ReviewTab;
}

function useReviewPlace(): ReviewPlace {
  const [tab, setTab] = useState<ReviewTab>("proposals");
  const [intentionView, setIntentionView] = useState<IntentionView>("screens");
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
    intentionView,
    moment,
    openIntention: (proposalId: string) => {
      closeMoment(false);
      setTab("proposals");
      setIntentionView("cards");
      setFocusIntentionId(proposalId);
    },
    selectIntentionView: (view: IntentionView) => {
      setFocusIntentionId(null);
      setIntentionView(view);
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
  onDeleted: () => void;
  onOpenBrief: () => void;
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
      <ReviewTabs detail={detail} place={place} />
      <div className="dt-ses-panel" hidden={place.moment !== null}>
        <ReviewTabPanel context={context} place={place} />
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
        onDeleted={links.onDeleted}
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
  isBriefOpen,
  links,
  review,
}: {
  detail: SessionDetail;
  isBriefOpen: boolean;
  links: ReviewLinks;
  review: ReviewHandle;
}) {
  const place = useReviewPlace();
  const context: ProposalContext = {
    actions: useProposalActions(review),
    canEdit: detail.session.canEdit,
    detail,
    focusIntentionId: place.focusIntentionId,
    navigation: {
      onOpenIntention: place.openIntention,
      onOpenSession: links.onOpenSession,
      onShowMoment: place.showMoment,
      onStarted: links.onStarted,
    },
    review,
  };

  if (isBriefOpen) {
    return <HandoffView detail={detail} review={review} />;
  }
  return (
    <>
      <ReviewTop context={context} links={links} />
      <ReviewPanels context={context} place={place} />
      {context.canEdit && (
        <ReviewFooter context={context} onOpenBrief={links.onOpenBrief} />
      )}
    </>
  );
}

export function SessionReview({
  isBriefOpen,
  links,
  sessionId,
}: {
  isBriefOpen: boolean;
  links: ReviewLinks;
  sessionId: string;
}) {
  const handle = useSessionDetail(sessionId);
  const { state } = handle;
  if (state.kind === "loading") {
    return <p className="dt-status">Loading the session…</p>;
  }
  if (state.kind === "ready") {
    return (
      <ReviewScreen
        detail={state.detail}
        isBriefOpen={isBriefOpen}
        links={links}
        review={handle}
      />
    );
  }
  if (state.kind === "missing") {
    return (
      <p className="dt-empty">
        This session is gone: it was deleted or is no longer shared with you.
      </p>
    );
  }
  return (
    <div className="dt-empty" role="alert">
      <p>The session did not load: {state.message}</p>
      <button className="dt-btn" onClick={handle.reload} type="button">
        Try again
      </button>
    </div>
  );
}
