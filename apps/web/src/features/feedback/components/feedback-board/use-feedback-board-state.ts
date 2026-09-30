import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { capture } from "@/lib/analytics";
import {
  type BoardFiltersActions,
  type BoardFiltersState,
  useBoardFilters,
} from "../../hooks/use-board-filters";
import { useFeedbackDrawer } from "../../hooks/use-feedback-drawer";
import type { FeedbackItem, FeedFeedbackView } from "../feed-feedback-view";
import type { FeedbackBoardProps } from "../feedback-board";
import type { FeedbackDetailDrawer } from "../feedback-detail/feedback-detail-drawer";
import type {
  InlineFeedbackInputHandle,
  InlineSubmitData,
} from "../inline-feedback-input";
import type { SubmitFeedbackDialog } from "../submit-feedback-dialog";
import { useFilteredFeedback } from "../use-filtered-feedback";
import { useOptimisticVotes } from "./use-optimistic-votes";
import { useSubmitFeedback } from "./use-submit-feedback";

type BoardFilters = BoardFiltersState & BoardFiltersActions;

type BoardScope = Pick<FeedbackBoardProps, "isMember" | "organizationId">;

function useBoardQueries(
  { organizationId, isMember }: BoardScope,
  filters: BoardFilters
) {
  const orgStatuses = useQuery(api.organizations.statuses.list, {
    organizationId,
  });
  const tags = useQuery(api.feedback.tags.list, { organizationId });
  const hasExplicitStatusFilter = filters.selectedStatusIds.length > 0;
  const feedback = useQuery(api.feedback.list.listByOrganization, {
    hideCompleted:
      (filters.hideCompleted && !hasExplicitStatusFilter) || undefined,
    organizationId,
    search: filters.searchQuery.trim() || undefined,
    sortBy: filters.sortBy,
    statusIds: hasExplicitStatusFilter ? filters.selectedStatusIds : undefined,
  });

  const [previousFeedback, setPreviousFeedback] = useState<NonNullable<
    typeof feedback
  > | null>(null);
  if (feedback !== undefined && feedback !== previousFeedback) {
    setPreviousFeedback(feedback);
  }

  const ensureStatusDefaults = useMutation(
    api.organizations.statuses.ensureDefaults
  );
  useEffect(() => {
    if (orgStatuses !== undefined && orgStatuses.length === 0 && isMember) {
      ensureStatusDefaults({ organizationId }).catch(() => undefined);
    }
  }, [orgStatuses, organizationId, isMember, ensureStatusDefaults]);

  return { feedback, orgStatuses, previousFeedback, tags };
}

function useFeedbackCreation({ organizationId, isMember }: BoardScope) {
  const createFeedbackPublic = useMutation(
    api.feedback.actions.createPublicOrg
  );
  const createFeedbackMember = useMutation(api.feedback.mutations.create);
  const assignFeedback = useMutation(api.feedback.triage_actions.assign);

  const handleInlineSubmit = async (data: InlineSubmitData) => {
    const attachments =
      data.attachments.length > 0 ? data.attachments : undefined;
    if (isMember) {
      await createFeedbackMember({
        attachments,
        description: data.description,
        organizationId,
        tagId: data.tagId,
        title: data.title,
      });
    } else {
      await createFeedbackPublic({
        attachments,
        description: data.description || undefined,
        email: data.email || undefined,
        organizationId,
        title: data.title,
      });
    }
    capture("feedback_created", {
      source: isMember ? "admin" : "public_board",
    });
  };

  return {
    assignFeedback,
    createFeedbackMember,
    createFeedbackPublic,
    handleInlineSubmit,
  };
}

function useSubmitDialogProps(
  props: FeedbackBoardProps,
  filters: BoardFilters,
  creation: ReturnType<typeof useFeedbackCreation>
): Omit<ComponentProps<typeof SubmitFeedbackDialog>, "tags"> {
  const submit = useSubmitFeedback({
    assignFeedback: creation.assignFeedback,
    closeSubmitDrawer: filters.closeSubmitDrawer,
    createFeedbackMember: creation.createFeedbackMember,
    createFeedbackPublic: creation.createFeedbackPublic,
    isMember: props.isMember,
    organizationId: props.organizationId,
  });
  return {
    error: submit.submitError,
    feedback: submit.newFeedback,
    isAdmin: props.isAdmin,
    isMember: props.isMember,
    isOpen: filters.showSubmitDrawer,
    isSubmitting: submit.isSubmitting,
    onAssigneeChange: submit.setSubmitAssigneeId,
    onFeedbackChange: submit.setNewFeedback,
    onOpenChange: (open) =>
      open ? filters.openSubmitDrawer() : filters.closeSubmitDrawer(),
    onSubmit: submit.handleSubmitFeedback,
    onTagChange: submit.setSubmitTagId,
    organizationId: props.organizationId,
    selectedAssigneeId: submit.submitAssigneeId,
    selectedTagId: submit.submitTagId,
  };
}

function useVotedFeedback(
  filters: BoardFilters,
  queries: ReturnType<typeof useBoardQueries>
) {
  const { guard: authGuard, isAuthenticated } = useAuthGuard({
    message: "Sign in to vote on this feedback",
  });
  const toggleVoteMutation = useMutation(api.feedback.votes.toggle);
  const { optimisticVotes, handleToggleVote } = useOptimisticVotes({
    authGuard,
    feedback: queries.feedback,
    isAuthenticated,
    toggleVoteMutation,
  });
  const filteredFeedback = useFilteredFeedback({
    feedback: queries.feedback,
    optimisticVotes,
    previousFeedback: queries.previousFeedback,
    selectedTagId: filters.selectedTagId,
    selectedTagIds: filters.selectedTagIds,
    sortBy: filters.sortBy,
  });
  return { filteredFeedback, handleToggleVote };
}

function useBoardDrawer(feedbackList: FeedbackItem[], isAdmin: boolean) {
  const feedbackIds = feedbackList.map((f) => f._id);
  const drawer = useFeedbackDrawer(feedbackIds);
  const detailDrawerProps: ComponentProps<typeof FeedbackDetailDrawer> = {
    currentIndex: drawer.currentIndex,
    feedbackId: drawer.selectedFeedbackId,
    feedbackIds,
    feedbackList,
    hasNext: drawer.hasNext,
    hasPrevious: drawer.hasPrevious,
    isAdmin,
    isOpen: drawer.isOpen,
    onClose: drawer.closeFeedback,
    onNext: drawer.goToNext,
    onPrevious: drawer.goToPrevious,
  };
  return { detailDrawerProps, openFeedback: drawer.openFeedback };
}

export function useFeedbackBoardState(props: FeedbackBoardProps) {
  const filters = useBoardFilters(props.defaultView ?? "feed");
  const queries = useBoardQueries(props, filters);
  const creation = useFeedbackCreation(props);
  const submitDialogProps = useSubmitDialogProps(props, filters, creation);
  const { filteredFeedback, handleToggleVote } = useVotedFeedback(
    filters,
    queries
  );
  const drawer = useBoardDrawer(filteredFeedback, props.isAdmin);
  const inlineInputRef = useRef<InlineFeedbackInputHandle>(null);
  const statuses = queries.orgStatuses ?? [];

  const feedProps: ComponentProps<typeof FeedFeedbackView> = {
    feedback: filteredFeedback,
    hasActiveFilters: filters.hasActiveFilters,
    hideCompleted: filters.hideCompleted,
    inlineInputRef,
    isAdmin: props.isAdmin,
    isMember: props.isMember,
    onClearFilters: filters.clearFilters,
    onHideCompletedToggle: () =>
      filters.setHideCompleted(!filters.hideCompleted),
    onInlineSubmit: creation.handleInlineSubmit,
    onSortChange: filters.setSortBy,
    onStatusChange: filters.handleStatusChange,
    onTagChange: filters.handleTagChange,
    selectedStatusIds: filters.selectedStatusIds,
    selectedTagIds: filters.selectedTagIds,
    sortBy: filters.sortBy,
    statuses,
    tags: queries.tags ?? [],
  };

  return {
    detailDrawerProps: drawer.detailDrawerProps,
    feedProps,
    filteredFeedback,
    filters,
    handleToggleVote,
    inlineInputRef,
    isLoading:
      queries.feedback === undefined && queries.previousFeedback === null,
    openFeedback: drawer.openFeedback,
    statuses,
    submitDialogProps: { ...submitDialogProps, tags: queries.tags },
    tags: queries.tags ?? [],
  };
}
