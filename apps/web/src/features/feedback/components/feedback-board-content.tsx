"use client";

import { ButtonLink } from "@ctrl-ui/react/ui/button";
import Link from "next/link";
import { FeedbackPage } from "@/features/feedback/components/feedback-board/feedback-page";
import { MilestonesView } from "@/features/milestones/components/milestones-view";
import { type BoardView, BoardViewToggle } from "./board-view-toggle";
import { FeedFeedbackView } from "./feed-feedback-view";
import type { FeedbackBoardProps } from "./feedback-board";
import { LoadingState, PrivateOrgMessage } from "./feedback-board/board-states";
import { FeedbackBoardProvider } from "./feedback-board/feedback-board-context";
import { FeedbackToolbar } from "./feedback-board/feedback-toolbar";
import { useFeedbackBoardState } from "./feedback-board/use-feedback-board-state";
import { FeedbackDetailDrawer } from "./feedback-detail/feedback-detail-drawer";
import { FiltersBar } from "./filters-bar";
import { RoadmapView } from "./roadmap-view";
import { SubmitFeedbackDialog } from "./submit-feedback-dialog";

function BoardActions({
  isAdmin,
  orgSlug,
  view,
  onViewChange,
}: {
  isAdmin: boolean;
  onViewChange: (view: BoardView) => void;
  orgSlug: string;
  view: BoardView;
}) {
  return (
    <>
      <div className="hidden items-center gap-2 md:flex">
        <BoardViewToggle onChange={onViewChange} size="sm" view={view} />
        {isAdmin && (
          <ButtonLink
            className="lg:hidden"
            render={<Link href={`/dashboard/${orgSlug}/feedback/review`} />}
            size="sm"
            variant="ghost"
          >
            Pending review
          </ButtonLink>
        )}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--mobile-nav-offset,env(safe-area-inset-bottom))+0.75rem)] z-50 flex justify-center md:hidden">
        <BoardViewToggle
          className="pointer-events-auto"
          onChange={onViewChange}
          view={view}
        />
      </div>
    </>
  );
}

export function FeedbackBoardContent(props: FeedbackBoardProps) {
  const board = useFeedbackBoardState(props);
  const { filters } = board;
  const { isAdmin, organizationId } = props;

  if (board.isLoading) {
    return <LoadingState view={filters.view} />;
  }

  if (!(props.isPublic || props.isMember)) {
    return <PrivateOrgMessage />;
  }

  return (
    <FeedbackBoardProvider
      isAdmin={isAdmin}
      onFeedbackClick={board.openFeedback}
      onVote={board.handleToggleVote}
      primaryColor={props.primaryColor}
      statuses={board.statuses}
    >
      <FeedbackPage
        actions={
          <BoardActions
            isAdmin={isAdmin}
            onViewChange={filters.setView}
            orgSlug={props.orgSlug}
            view={filters.view}
          />
        }
        view={filters.view}
      >
        {filters.view !== "milestones" && (
          <>
            <FeedbackToolbar
              inlineInputRef={
                filters.view === "feed" ? board.inlineInputRef : undefined
              }
              isAdmin={isAdmin}
              onClearTags={() => filters.setSelectedTagIds([])}
              onSearchChange={filters.setSearchQuery}
              onSubmitClick={filters.openSubmitDrawer}
              onTagChange={filters.handleTagChange}
              organizationId={organizationId}
              searchQuery={filters.searchQuery}
              selectedTagIds={filters.selectedTagIds}
              showSearch={
                board.filteredFeedback.length > 0 ||
                filters.searchQuery.length > 0
              }
              tags={board.tags}
            />

            <FiltersBar {...board.feedProps} />
          </>
        )}
        {filters.view === "milestones" && (
          <p className="mb-4 text-muted-foreground text-sm">
            Milestones group planned work. Feedback filters apply to List and
            Board.
          </p>
        )}
        {
          {
            feed: <FeedFeedbackView {...board.feedProps} />,
            milestones: (
              <MilestonesView
                isAdmin={isAdmin}
                onFeedbackClick={board.openFeedback}
                organizationId={organizationId}
              />
            ),
            roadmap: (
              <RoadmapView
                feedback={board.filteredFeedback}
                isAdmin={isAdmin}
                onFeedbackClick={board.openFeedback}
                organizationId={organizationId}
                statuses={board.statuses}
              />
            ),
          }[filters.view]
        }

        <FeedbackDetailDrawer {...board.detailDrawerProps} />
        <SubmitFeedbackDialog {...board.submitDialogProps} />
      </FeedbackPage>
    </FeedbackBoardProvider>
  );
}
