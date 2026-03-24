"use client";

import {
  ArrowRight,
  CheckCircle,
  GitMerge,
  Warning,
  XCircle,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type OrganizationId = Id<"organizations">;

function SimilarityBadge({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const getVariant = (): "destructive" | "default" | "secondary" => {
    if (percentage >= 90) {
      return "destructive";
    }
    if (percentage >= 75) {
      return "default";
    }
    return "secondary";
  };

  return <Badge variant={getVariant()}>{percentage}% similar</Badge>;
}

function FeedbackPreview({
  title,
  description,
  voteCount,
  status,
}: {
  title: string;
  description: string;
  voteCount: number;
  status: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="font-medium text-sm leading-tight">{title}</p>
      <p className="line-clamp-2 text-muted-foreground text-xs">
        {description || "No description"}
      </p>
      <div className="flex items-center gap-2">
        <Badge className="text-xs" variant="outline">
          {status.replace("_", " ")}
        </Badge>
        <span className="text-muted-foreground text-xs">
          {voteCount} {voteCount === 1 ? "vote" : "votes"}
        </span>
      </div>
    </div>
  );
}

export function DuplicateReviewPanel({
  organizationId,
}: {
  organizationId: OrganizationId;
}) {
  const pendingDuplicates = useQuery(
    api.duplicates.merge.getPendingDuplicates,
    { organizationId }
  );
  const mergeHistory = useQuery(api.duplicates.merge.getMergeHistory, {
    organizationId,
  });
  const resolveDuplicate = useMutation(api.duplicates.merge.resolveDuplicate);
  const mergeFeedback = useMutation(api.duplicates.merge.mergeFeedback);

  const handleReject = async (pairId: Id<"duplicatePairs">) => {
    try {
      await resolveDuplicate({ pairId, action: "reject" });
      toast.success("Duplicate pair dismissed");
    } catch {
      toast.error("Failed to dismiss duplicate pair");
    }
  };

  const handleMerge = async (
    sourceFeedbackId: Id<"feedback">,
    targetFeedbackId: Id<"feedback">,
    pairId: Id<"duplicatePairs">
  ) => {
    try {
      await mergeFeedback({ sourceFeedbackId, targetFeedbackId, pairId });
      toast.success("Feedback merged successfully");
    } catch {
      toast.error("Failed to merge feedback");
    }
  };

  if (pendingDuplicates === undefined) {
    return (
      <div className="space-y-4">
        {["a", "b", "c"].map((id) => (
          <Skeleton className="h-32" key={id} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Duplicates */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Warning className="size-5 text-amber-500" weight="fill" />
          <h3 className="font-semibold text-lg">
            Pending Review ({pendingDuplicates.length})
          </h3>
        </div>

        {pendingDuplicates.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle
                className="mx-auto mb-2 size-8 text-green-500"
                weight="fill"
              />
              <p className="text-muted-foreground text-sm">
                No duplicate pairs pending review
              </p>
            </CardContent>
          </Card>
        ) : (
          pendingDuplicates.map((pair) => (
            <Card key={pair._id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SimilarityBadge score={pair.similarityScore} />
                    <CardDescription>
                      Detected{" "}
                      {formatDistanceToNow(pair.detectedAt, {
                        addSuffix: true,
                      })}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
                  <FeedbackPreview
                    description={pair.feedbackA.description}
                    status={pair.feedbackA.status}
                    title={pair.feedbackA.title}
                    voteCount={pair.feedbackA.voteCount}
                  />
                  <ArrowRight className="mt-2 size-4 text-muted-foreground" />
                  <FeedbackPreview
                    description={pair.feedbackB.description}
                    status={pair.feedbackB.status}
                    title={pair.feedbackB.title}
                    voteCount={pair.feedbackB.voteCount}
                  />
                </div>

                <div className="flex items-center gap-2 border-t pt-3">
                  <Button
                    onClick={() =>
                      handleMerge(
                        pair.feedbackA._id,
                        pair.feedbackB._id,
                        pair._id
                      )
                    }
                    size="sm"
                  >
                    <GitMerge className="mr-1 size-3.5" />
                    Merge A → B
                  </Button>
                  <Button
                    onClick={() =>
                      handleMerge(
                        pair.feedbackB._id,
                        pair.feedbackA._id,
                        pair._id
                      )
                    }
                    size="sm"
                    variant="outline"
                  >
                    <GitMerge className="mr-1 size-3.5" />
                    Merge B → A
                  </Button>
                  <Button
                    onClick={() => handleReject(pair._id)}
                    size="sm"
                    variant="ghost"
                  >
                    <XCircle className="mr-1 size-3.5" />
                    Not Duplicate
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Merge History */}
      {mergeHistory && mergeHistory.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <GitMerge className="size-5 text-muted-foreground" />
            <h3 className="font-semibold text-lg">Recent Merges</h3>
          </div>

          <Card>
            <CardContent className="divide-y p-0">
              {mergeHistory.map((entry) => (
                <div
                  className="flex items-center justify-between px-4 py-3"
                  key={entry._id}
                >
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm">{entry.sourceTitle}</p>
                    <p className="text-muted-foreground text-xs">
                      {entry.sourceVoteCount} votes transferred
                    </p>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {formatDistanceToNow(entry.mergedAt, { addSuffix: true })}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
