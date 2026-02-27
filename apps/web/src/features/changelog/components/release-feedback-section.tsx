"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { FeedbackMatch } from "../hooks/use-feedback-matching";
import { useFeedbackMatching } from "../hooks/use-feedback-matching";
import {
  FeedbackSearchInput,
  LinkedFeedbackList,
} from "./feedback-list-controls";
import type { FeedbackLinkStatus } from "./feedback-section-header";
import { FeedbackSectionHeader } from "./feedback-section-header";
import { FeedbackSuggestionList } from "./feedback-suggestion-list";
import type { CommitInfo } from "./generate-from-commits";

interface ReleaseFeedbackSectionProps {
  organizationId: Id<"organizations">;
  releaseId: Id<"releases"> | null;
  description: string;
  commits: CommitInfo[];
  autoTriggerMatching?: boolean;
  onLinkStatusChange?: (status: FeedbackLinkStatus) => void;
  className?: string;
}

export function ReleaseFeedbackSection({
  organizationId,
  releaseId,
  description,
  commits,
  autoTriggerMatching,
  onLinkStatusChange,
  className,
}: ReleaseFeedbackSectionProps) {
  const linkFeedback = useMutation(
    api.changelog_actions.linkFeedback
  ).withOptimisticUpdate((localStore, args) => {
    const available = localStore.getQuery(
      api.changelog_actions.getAvailableFeedback,
      { organizationId, excludeReleaseId: args.releaseId }
    );
    if (available) {
      localStore.setQuery(
        api.changelog_actions.getAvailableFeedback,
        { organizationId, excludeReleaseId: args.releaseId },
        available.filter((f) => f._id !== args.feedbackId)
      );
    }
  });

  const unlinkFeedback = useMutation(
    api.changelog_actions.unlinkFeedback
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.changelog.get, {
      id: args.releaseId,
    });
    if (!current) {
      return;
    }
    localStore.setQuery(
      api.changelog.get,
      { id: args.releaseId },
      {
        ...current,
        feedbackItems: current.feedbackItems.filter(
          (f) => f !== null && f._id !== args.feedbackId
        ),
      }
    );
  });

  const releaseData = useQuery(
    api.changelog.get,
    releaseId ? { id: releaseId } : "skip"
  );

  const availableFeedback = useQuery(
    api.changelog_actions.getAvailableFeedback,
    { organizationId, excludeReleaseId: releaseId ?? undefined }
  );

  const { matches, isMatching, matchFeedback, clearMatches } =
    useFeedbackMatching();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [hasAutoTriggered, setHasAutoTriggered] = useState(false);
  const [linkStatus, setLinkStatus] = useState<FeedbackLinkStatus>("completed");

  const handleLinkStatusChange = useCallback(
    (status: FeedbackLinkStatus) => {
      setLinkStatus(status);
      onLinkStatusChange?.(status);
    },
    [onLinkStatusChange]
  );

  const linkedFeedback = (releaseData?.feedbackItems ?? [])
    .filter((f): f is NonNullable<typeof f> => f !== null)
    .map((f) => ({
      _id: f._id,
      title: f.title,
      status: f.status,
    }));

  useAutoTriggerMatching({
    autoTriggerMatching,
    hasAutoTriggered,
    description,
    commits,
    availableFeedback,
    setHasAutoTriggered,
    matchFeedback,
  });

  const handleTriggerMatching = useCallback(() => {
    if (!availableFeedback || availableFeedback.length === 0) {
      toast.info("No feedback items available to match");
      return;
    }
    if (!description.trim()) {
      toast.info("Generate release notes first to find related feedback");
      return;
    }
    matchFeedback(description, commits, availableFeedback);
  }, [availableFeedback, description, commits, matchFeedback]);

  const handleToggleSelection = useCallback(
    (feedbackId: string, checked: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(feedbackId);
        } else {
          next.delete(feedbackId);
        }
        return next;
      });
    },
    []
  );

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(matches.map((m) => m.feedbackId)));
  }, [matches]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleLinkSelected = useCallback(async () => {
    if (!releaseId || selectedIds.size === 0) {
      return;
    }
    setIsLinking(true);
    try {
      const statusToSet = linkStatus !== "keep" ? linkStatus : undefined;
      for (const feedbackId of selectedIds) {
        await linkFeedback({
          releaseId,
          feedbackId: feedbackId as Id<"feedback">,
          newStatus: statusToSet,
        });
      }
      toast.success(
        `Linked ${selectedIds.size} feedback item${selectedIds.size === 1 ? "" : "s"}`
      );
      setSelectedIds(new Set());
      clearMatches();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to link feedback"
      );
    } finally {
      setIsLinking(false);
    }
  }, [releaseId, selectedIds, linkFeedback, clearMatches, linkStatus]);

  const handleUnlink = useCallback(
    async (feedbackId: Id<"feedback">) => {
      if (!releaseId) {
        return;
      }
      try {
        await unlinkFeedback({ releaseId, feedbackId });
        toast.success("Feedback unlinked");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to unlink feedback"
        );
      }
    },
    [releaseId, unlinkFeedback]
  );

  const handleManualLink = useCallback(
    async (feedbackId: Id<"feedback">) => {
      if (!releaseId) {
        return;
      }
      try {
        const statusToSet = linkStatus !== "keep" ? linkStatus : undefined;
        await linkFeedback({ releaseId, feedbackId, newStatus: statusToSet });
        toast.success("Feedback linked");
        setSearchQuery("");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to link feedback"
        );
      }
    },
    [releaseId, linkFeedback, linkStatus]
  );

  const linkedIds = new Set(linkedFeedback.map((f) => f._id));
  const suggestedFeedback = buildSuggestedFeedback(
    matches,
    linkedIds,
    availableFeedback
  );

  const allSelected =
    suggestedFeedback.length > 0 &&
    suggestedFeedback.every((f) => selectedIds.has(f._id));

  const searchResults = searchQuery.trim()
    ? (availableFeedback ?? []).filter((f) =>
        f.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className={cn("space-y-3", className)}>
      <FeedbackSectionHeader
        availableFeedback={availableFeedback}
        description={description}
        isMatching={isMatching}
        linkedCount={linkedFeedback.length}
        linkStatus={linkStatus}
        onLinkStatusChange={handleLinkStatusChange}
        onTriggerMatching={handleTriggerMatching}
        releaseId={releaseId}
      />

      {linkedFeedback.length > 0 && (
        <LinkedFeedbackList
          items={linkedFeedback}
          onUnlink={handleUnlink}
          releaseId={releaseId}
        />
      )}

      <FeedbackSuggestionList
        allSelected={allSelected}
        hasReleaseId={releaseId !== null}
        isLinking={isLinking}
        items={suggestedFeedback}
        onDeselectAll={handleDeselectAll}
        onLinkSelected={handleLinkSelected}
        onSelectAll={handleSelectAll}
        onToggleSelection={handleToggleSelection}
        selectedIds={selectedIds}
      />

      {releaseId && (
        <FeedbackSearchInput
          onLink={handleManualLink}
          searchQuery={searchQuery}
          searchResults={searchResults}
          setSearchQuery={setSearchQuery}
        />
      )}

      {linkedFeedback.length === 0 &&
        suggestedFeedback.length === 0 &&
        !isMatching && (
          <p className="text-muted-foreground text-xs">
            {releaseId
              ? "No feedback linked yet. Use AI to find related items, or search manually."
              : "Save as draft first to link feedback items."}
          </p>
        )}
    </div>
  );
}

// --- Helpers ---

interface AutoTriggerParams {
  autoTriggerMatching: boolean | undefined;
  hasAutoTriggered: boolean;
  description: string;
  commits: CommitInfo[];
  availableFeedback:
    | Array<{
        _id: Id<"feedback">;
        title: string;
        description?: string;
        status: string;
        voteCount: number;
        tags: Array<{ _id: Id<"tags">; name: string }>;
      }>
    | undefined;
  setHasAutoTriggered: (v: boolean) => void;
  matchFeedback: (
    desc: string,
    commits: CommitInfo[],
    feedback: Array<{
      _id: Id<"feedback">;
      title: string;
      description?: string;
      status: string;
      voteCount: number;
      tags: Array<{ _id: Id<"tags">; name: string }>;
    }>
  ) => Promise<void>;
}

function useAutoTriggerMatching({
  autoTriggerMatching,
  hasAutoTriggered,
  description,
  commits,
  availableFeedback,
  setHasAutoTriggered,
  matchFeedback,
}: AutoTriggerParams) {
  useEffect(() => {
    const canAutoTrigger =
      autoTriggerMatching &&
      !hasAutoTriggered &&
      description.trim() &&
      commits.length > 0 &&
      availableFeedback &&
      availableFeedback.length > 0;

    if (canAutoTrigger) {
      setHasAutoTriggered(true);
      matchFeedback(description, commits, availableFeedback);
    }
  }, [
    autoTriggerMatching,
    hasAutoTriggered,
    description,
    commits,
    availableFeedback,
    setHasAutoTriggered,
    matchFeedback,
  ]);
}

function buildSuggestedFeedback(
  matches: FeedbackMatch[],
  linkedIds: Set<Id<"feedback">>,
  availableFeedback:
    | Array<{
        _id: Id<"feedback">;
        title: string;
        status: string;
      }>
    | undefined
): Array<{
  _id: Id<"feedback">;
  title: string;
  status: string;
  match: FeedbackMatch;
}> {
  const results: Array<{
    _id: Id<"feedback">;
    title: string;
    status: string;
    match: FeedbackMatch;
  }> = [];
  for (const m of matches) {
    if (linkedIds.has(m.feedbackId as Id<"feedback">)) {
      continue;
    }
    const feedback = availableFeedback?.find((f) => f._id === m.feedbackId);
    if (feedback) {
      results.push({ ...feedback, match: m });
    }
  }
  return results;
}
