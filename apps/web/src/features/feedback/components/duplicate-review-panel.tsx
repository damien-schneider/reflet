"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@ctrl-ui/react/ui/card";
import { toast } from "@ctrl-ui/react/ui/toast";
import { GitMerge, XCircle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import {
  AllCaughtUp,
  ReviewQueueSkeleton,
  ReviewSectionHeader,
  StatusAnnouncer,
} from "./review-queue-parts";

const PERCENTAGE_SCALE = 100;
const HIGH_SIMILARITY_PERCENTAGE = 90;

interface PairFeedback {
  _id: Id<"feedback">;
  description: string;
  status: string;
  title: string;
  voteCount: number;
}

interface DuplicatePair {
  _id: Id<"duplicatePairs">;
  detectedAt: number;
  feedbackA: PairFeedback;
  feedbackB: PairFeedback;
  similarityScore: number;
}

type PairAction = "keepA" | "keepB" | "reject";

function formatStatus(status: string) {
  const words = status.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function FeedbackSide({
  feedback,
  other,
  canMerge,
  disabled,
  isKeeping,
  onKeep,
}: {
  feedback: PairFeedback;
  other: PairFeedback;
  canMerge: boolean;
  disabled: boolean;
  isKeeping: boolean;
  onKeep: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border p-3">
      <div className="min-w-0 flex-1 space-y-1.5">
        <h3 className="text-pretty font-medium text-sm leading-tight">
          {feedback.title}
        </h3>
        {feedback.description && (
          <p className="line-clamp-3 text-pretty text-muted-foreground text-sm">
            {feedback.description}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Badge variant="outline">{formatStatus(feedback.status)}</Badge>
          <span className="text-muted-foreground text-xs tabular-nums">
            {feedback.voteCount} {feedback.voteCount === 1 ? "vote" : "votes"}
          </span>
        </div>
      </div>
      {canMerge && (
        <Button
          aria-label={`Keep “${feedback.title}” and merge “${other.title}” into it`}
          className="self-start"
          disabled={disabled}
          onClick={onKeep}
          size="xs"
          variant="surface"
        >
          <GitMerge aria-hidden className="size-3.5" />
          {isKeeping ? "Merging…" : "Keep this one"}
        </Button>
      )}
    </div>
  );
}

function DuplicatePairCard({
  pair,
  canMerge,
  pendingAction,
  onAction,
}: {
  pair: DuplicatePair;
  canMerge: boolean;
  pendingAction: PairAction | null;
  onAction: (pair: DuplicatePair, action: PairAction) => void;
}) {
  const percentage = Math.round(pair.similarityScore * PERCENTAGE_SCALE);
  const busy = pendingAction !== null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge
            className="tabular-nums"
            color={
              percentage >= HIGH_SIMILARITY_PERCENTAGE ? "orange" : "neutral"
            }
          >
            {percentage}% similar
          </Badge>
          <CardDescription>
            Detected {formatDistanceToNow(pair.detectedAt, { addSuffix: true })}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <FeedbackSide
            canMerge={canMerge}
            disabled={busy}
            feedback={pair.feedbackA}
            isKeeping={pendingAction === "keepA"}
            onKeep={() => onAction(pair, "keepA")}
            other={pair.feedbackB}
          />
          <FeedbackSide
            canMerge={canMerge}
            disabled={busy}
            feedback={pair.feedbackB}
            isKeeping={pendingAction === "keepB"}
            onKeep={() => onAction(pair, "keepB")}
            other={pair.feedbackA}
          />
        </div>
        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <p className="text-muted-foreground text-xs">
            {canMerge
              ? "Votes and subscribers move to the one you keep."
              : "Only admins can merge posts."}
          </p>
          <Button
            disabled={busy}
            onClick={() => onAction(pair, "reject")}
            size="xs"
            variant="ghost"
          >
            <XCircle aria-hidden className="size-3.5" />
            {pendingAction === "reject" ? "Dismissing…" : "Not a duplicate"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MergeHistory({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const mergeHistory = useQuery(api.duplicates.merge.getMergeHistory, {
    organizationId,
  });

  if (!mergeHistory || mergeHistory.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <ReviewSectionHeader title="Recent merges" />
      <Card>
        <CardContent className="divide-y p-0">
          {mergeHistory.map((entry) => (
            <div
              className="flex items-center justify-between gap-4 px-4 py-3"
              key={entry._id}
            >
              <div className="min-w-0 space-y-0.5">
                <p
                  className="truncate font-medium text-sm"
                  title={entry.sourceTitle}
                >
                  {entry.sourceTitle}
                </p>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {entry.sourceVoteCount}{" "}
                  {entry.sourceVoteCount === 1 ? "vote" : "votes"} transferred
                </p>
              </div>
              <time
                className="shrink-0 text-muted-foreground text-xs"
                dateTime={new Date(entry.mergedAt).toISOString()}
              >
                {formatDistanceToNow(entry.mergedAt, { addSuffix: true })}
              </time>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

function useDuplicateActions() {
  const resolveDuplicate = useMutation(api.duplicates.merge.resolveDuplicate);
  const mergeFeedback = useMutation(api.duplicates.merge.mergeFeedback);
  const [pending, setPending] = useState<{
    action: PairAction;
    pairId: Id<"duplicatePairs">;
  } | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const runAction = async (pair: DuplicatePair, action: PairAction) => {
    setPending({ action, pairId: pair._id });
    try {
      if (action === "reject") {
        await resolveDuplicate({ action: "reject", pairId: pair._id });
        setAnnouncement("Marked as not a duplicate");
      } else {
        const kept = action === "keepA" ? pair.feedbackA : pair.feedbackB;
        const merged = action === "keepA" ? pair.feedbackB : pair.feedbackA;
        await mergeFeedback({
          pairId: pair._id,
          sourceFeedbackId: merged._id,
          targetFeedbackId: kept._id,
        });
        setAnnouncement(`Merged into “${kept.title}”`);
      }
    } catch {
      toast.error(
        action === "reject"
          ? "Couldn’t dismiss this pair. Try again."
          : "Couldn’t merge this pair. Try again."
      );
    }
    setPending(null);
  };

  return { announcement, pending, runAction };
}

export function DuplicateReviewPanel({
  canMerge,
  organizationId,
}: {
  canMerge: boolean;
  organizationId: Id<"organizations">;
}) {
  const pendingDuplicates = useQuery(
    api.duplicates.merge.getPendingDuplicates,
    { organizationId }
  );
  const { announcement, pending, runAction } = useDuplicateActions();

  if (pendingDuplicates === undefined) {
    return <ReviewQueueSkeleton />;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <ReviewSectionHeader
          count={pendingDuplicates.length}
          title="Possible duplicates"
        />
        {pendingDuplicates.length === 0 ? (
          <AllCaughtUp description="When two posts look alike, they show up here side by side." />
        ) : (
          pendingDuplicates.map((pair) => (
            <DuplicatePairCard
              canMerge={canMerge}
              key={pair._id}
              onAction={runAction}
              pair={pair}
              pendingAction={
                pending?.pairId === pair._id ? pending.action : null
              }
            />
          ))
        )}
      </section>
      <MergeHistory organizationId={organizationId} />
      <StatusAnnouncer message={announcement} />
    </div>
  );
}
