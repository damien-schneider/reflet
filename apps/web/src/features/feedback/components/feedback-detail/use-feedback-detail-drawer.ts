import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useHotkeys } from "react-hotkeys-hook";
import { isCompositeWidgetFocused } from "./composite-widget-focus";
import type { FeedbackListItem } from "./feedback-detail-drawer-types";

function toFallbackFeedback(
  feedbackId: Id<"feedback">,
  listItem: FeedbackListItem
) {
  return {
    _id: feedbackId,
    assignee: null,
    author: null,
    commentCount: listItem.commentCount,
    createdAt: listItem.createdAt,
    description: listItem.description ?? null,
    hasVoted: listItem.hasVoted,
    isInternal: listItem.isInternal,
    organizationId: listItem.organizationId,
    organizationStatusId: listItem.organizationStatusId,
    tags: listItem.tags
      ?.filter((t): t is NonNullable<typeof t> => t !== null)
      .map((t) => ({
        _id: t._id,
        color: t.color,
        name: t.name,
      })),
    title: listItem.title,
    userVoteType: listItem.userVoteType,
    voteCount: listItem.voteCount,
  };
}

export function useDrawerFeedback(
  feedbackId: Id<"feedback"> | null,
  feedbackList: FeedbackListItem[]
) {
  const feedbackDetails = useQuery(
    api.feedback.queries.get,
    feedbackId ? { id: feedbackId } : "skip"
  );

  const listItem = feedbackId
    ? feedbackList.find((f) => f._id === feedbackId)
    : null;

  return (
    feedbackDetails ??
    (listItem && feedbackId ? toFallbackFeedback(feedbackId, listItem) : null)
  );
}

function useNavigationHotkey(
  key: string,
  onNavigate: (() => void) | undefined,
  enabled: boolean
) {
  useHotkeys(
    key,
    () => {
      if (!isCompositeWidgetFocused()) {
        onNavigate?.();
      }
    },
    { enabled },
    [enabled, onNavigate]
  );
}

interface DrawerNavigationHotkeysOptions {
  hasNext: boolean;
  hasPrevious: boolean;
  isOpen: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
}

export function useDrawerNavigationHotkeys({
  hasNext,
  hasPrevious,
  isOpen,
  onNext,
  onPrevious,
}: DrawerNavigationHotkeysOptions) {
  const canGoNext = isOpen && hasNext;
  const canGoPrevious = isOpen && hasPrevious;

  useNavigationHotkey("j", onNext, canGoNext);
  useNavigationHotkey("k", onPrevious, canGoPrevious);
  useNavigationHotkey("ArrowDown", onNext, canGoNext);
  useNavigationHotkey("ArrowUp", onPrevious, canGoPrevious);
}
