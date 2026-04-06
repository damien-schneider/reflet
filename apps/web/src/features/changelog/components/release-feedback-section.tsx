"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFeedbackMatching } from "../hooks/use-feedback-matching";
import { getMatchesToAutoLink } from "../lib/get-matches-to-auto-link";
import {
  FeedbackSearchInput,
  LinkedFeedbackList,
} from "./feedback-list-controls";
import type { FeedbackLinkStatus } from "./feedback-section-header";
import { FeedbackSectionHeader } from "./feedback-section-header";
import type { CommitInfo } from "./generate-from-commits";

interface ReleaseFeedbackSectionProps {
  autoTriggerMatching?: boolean;
  className?: string;
  commits: CommitInfo[];
  description: string;
  onLinkStatusChange?: (status: FeedbackLinkStatus) => void;
  organizationId: Id<"organizations">;
  releaseId: Id<"releases"> | null;
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
    api.changelog.feedback_linking.linkFeedback
  ).withOptimisticUpdate((localStore, args) => {
    const available = localStore.getQuery(
      api.changelog.feedback_linking.getAvailableFeedback,
      { organizationId, excludeReleaseId: args.releaseId }
    );
    if (available) {
      localStore.setQuery(
        api.changelog.feedback_linking.getAvailableFeedback,
        { organizationId, excludeReleaseId: args.releaseId },
        available.filter((f) => f._id !== args.feedbackId)
      );
    }
  });

  const unlinkFeedback = useMutation(
    api.changelog.feedback_linking.unlinkFeedback
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.changelog.queries.get, {
      id: args.releaseId,
    });
    if (!current) {
      return;
    }
    localStore.setQuery(
      api.changelog.queries.get,
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
    api.changelog.queries.get,
    releaseId ? { id: releaseId } : "skip"
  );

  const availableFeedback = useQuery(
    api.changelog.feedback_linking.getAvailableFeedback,
    { organizationId, excludeReleaseId: releaseId ?? undefined }
  );

  const { matches, isMatching, matchError, matchFeedback, clearMatches } =
    useFeedbackMatching();

  const [searchQuery, setSearchQuery] = useState("");
  const [hasAutoTriggered, setHasAutoTriggered] = useState(false);
  const [linkStatus, setLinkStatus] = useState<FeedbackLinkStatus>("completed");
  const autoLinkInProgress = useRef(false);
  const wasMatchingRef = useRef(false);
  const linkStatusRef = useRef(linkStatus);
  linkStatusRef.current = linkStatus;

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

  // Auto-link matched feedback when AI returns results
  useEffect(
    function autoLinkMatchedFeedback() {
      if (
        matches.length === 0 ||
        !releaseId ||
        isMatching ||
        autoLinkInProgress.current
      ) {
        return;
      }

      const linkedIds = new Set(
        (releaseData?.feedbackItems ?? [])
          .filter((f): f is NonNullable<typeof f> => f !== null)
          .map((f) => f._id)
      );

      const toLink = getMatchesToAutoLink(matches, linkedIds);
      if (toLink.length === 0) {
        clearMatches();
        return;
      }

      let cancelled = false;
      autoLinkInProgress.current = true;
      const statusToSet =
        linkStatusRef.current === "keep" ? undefined : linkStatusRef.current;

      (async () => {
        const results = await Promise.allSettled(
          toLink.map((feedbackId) =>
            linkFeedback({
              releaseId,
              feedbackId: feedbackId as Id<"feedback">,
              newStatus: statusToSet,
            })
          )
        );

        if (cancelled) {
          autoLinkInProgress.current = false;
          return;
        }

        const succeeded = results.filter(
          (r) => r.status === "fulfilled"
        ).length;
        const failed = results.filter((r) => r.status === "rejected").length;

        if (succeeded > 0) {
          toast.success(
            `Auto-linked ${succeeded} related feedback item${succeeded === 1 ? "" : "s"}`
          );
        }
        if (failed > 0) {
          toast.error(
            `Failed to auto-link ${failed} feedback item${failed === 1 ? "" : "s"}`
          );
        }

        clearMatches();
        autoLinkInProgress.current = false;
      })();

      return () => {
        cancelled = true;
      };
    },
    [matches, releaseId, isMatching, releaseData, linkFeedback, clearMatches]
  );

  // Show toast for matching errors and zero-match results
  useEffect(
    function showMatchingResultToasts() {
      if (matchError) {
        toast.error(`Failed to find related feedback: ${matchError}`);
        wasMatchingRef.current = false;
        return;
      }

      if (isMatching) {
        wasMatchingRef.current = true;
        return;
      }

      // Matching just completed (was matching, now isn't)
      if (wasMatchingRef.current && !isMatching && matches.length === 0) {
        toast.info("No related feedback found for this release");
      }
      wasMatchingRef.current = false;
    },
    [matchError, isMatching, matches.length]
  );

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
        const statusToSet = linkStatus === "keep" ? undefined : linkStatus;
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

      {releaseId && (
        <FeedbackSearchInput
          onLink={handleManualLink}
          searchQuery={searchQuery}
          searchResults={searchResults}
          setSearchQuery={setSearchQuery}
        />
      )}

      {linkedFeedback.length === 0 && !isMatching && (
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
  commits: CommitInfo[];
  description: string;
  hasAutoTriggered: boolean;
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
  setHasAutoTriggered: (v: boolean) => void;
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
  useEffect(
    function autoTriggerFeedbackMatching() {
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
    },
    [
      autoTriggerMatching,
      hasAutoTriggered,
      description,
      commits,
      availableFeedback,
      setHasAutoTriggered,
      matchFeedback,
    ]
  );
}
