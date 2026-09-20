"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@ctrl-ui/react/ui/card";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { toast } from "@ctrl-ui/react/ui/toast";
import {
  ArrowSquareOut,
  CheckCircle,
  Sparkle,
  Trash,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import { AiMiniIndicator } from "./ai-mini-indicator";
import { NeedsReviewBadge } from "./needs-review-badge";

const PERCENTAGE_SCALE = 100;
const LOW_USEFULNESS_PERCENTAGE = 25;
const MEDIUM_USEFULNESS_PERCENTAGE = 50;

const SOURCE_LABELS = {
  api: "API",
  web: "Web",
  widget: "Widget",
} as const;

interface PendingReviewPanelProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
}

function HoldReason({
  junk,
  usefulness,
}: {
  junk?: number;
  usefulness?: number;
}) {
  if (junk !== undefined) {
    return (
      <AiMiniIndicator
        label={`${Math.round(junk * PERCENTAGE_SCALE)}% likely junk`}
        type="high"
      />
    );
  }

  if (usefulness === undefined) {
    return null;
  }

  const percentage = Math.round(usefulness * PERCENTAGE_SCALE);
  const type = (() => {
    if (percentage < LOW_USEFULNESS_PERCENTAGE) {
      return "none";
    }
    if (percentage < MEDIUM_USEFULNESS_PERCENTAGE) {
      return "medium";
    }
    return "high";
  })();

  return <AiMiniIndicator label={`${percentage}% useful`} type={type} />;
}

export function PendingReviewPanel({
  organizationId,
  orgSlug,
}: PendingReviewPanelProps) {
  const pendingReview = useQuery(api.feedback.review.listPendingReview, {
    organizationId,
  });
  const updateFeedback = useMutation(api.feedback.mutations.update);
  const removeFeedback = useMutation(api.feedback.actions.remove);
  const [pendingId, setPendingId] = useState<Id<"feedback"> | null>(null);

  const handleApprove = async (id: Id<"feedback">) => {
    setPendingId(id);
    try {
      await updateFeedback({ id, isApproved: true });
      toast.success("Feedback approved");
    } catch {
      toast.error("Failed to approve feedback");
    } finally {
      setPendingId(null);
    }
  };

  const handleDismiss = async (id: Id<"feedback">) => {
    setPendingId(id);
    try {
      await removeFeedback({ id });
      toast.success("Feedback dismissed");
    } catch {
      toast.error("Failed to dismiss feedback");
    } finally {
      setPendingId(null);
    }
  };

  if (pendingReview === undefined) {
    return (
      <div className="space-y-4">
        {["a", "b", "c"].map((id) => (
          <Skeleton className="h-32" key={id} />
        ))}
      </div>
    );
  }

  const { canApprove, items } = pendingReview;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkle className="size-5 text-primary" weight="fill" />
        <h3 className="font-semibold text-lg">
          Pending review ({items.length})
        </h3>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle
              className="mx-auto mb-2 size-8 text-success"
              weight="fill"
            />
            <p className="text-muted-foreground text-sm">
              Nothing waiting for review
            </p>
          </CardContent>
        </Card>
      ) : (
        items.map((item) => (
          <Card key={item._id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium text-sm leading-tight">
                    {item.title}
                  </p>
                  <CardDescription>
                    Submitted{" "}
                    {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                  </CardDescription>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <HoldReason
                    junk={item.aiJunk}
                    usefulness={item.aiUsefulness}
                  />
                  <NeedsReviewBadge probability={item.aiNeedsReview} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="line-clamp-2 text-muted-foreground text-xs">
                {item.description || "No description"}
              </p>

              {item.source && (
                <Badge className="text-xs" variant="outline">
                  {SOURCE_LABELS[item.source]}
                </Badge>
              )}

              <div className="flex items-center gap-2 border-t pt-3">
                {canApprove && (
                  <>
                    <Button
                      aria-label={`Approve ${item.title}`}
                      disabled={pendingId === item._id}
                      onClick={() => handleApprove(item._id)}
                      size="xs"
                      tone="primary"
                      variant="solid"
                    >
                      <CheckCircle className="mr-1 size-3.5" />
                      Approve
                    </Button>
                    <Button
                      aria-label={`Dismiss ${item.title}`}
                      disabled={pendingId === item._id}
                      onClick={() => handleDismiss(item._id)}
                      size="xs"
                      tone="danger"
                      variant="ghost"
                    >
                      <Trash className="mr-1 size-3.5" />
                      Dismiss
                    </Button>
                  </>
                )}
                <ButtonLink
                  aria-label={`Open ${item.title}`}
                  render={
                    <Link href={`/dashboard/${orgSlug}/feedback/${item._id}`} />
                  }
                  size="xs"
                  variant="ghost"
                >
                  <ArrowSquareOut className="mr-1 size-3.5" />
                  Open
                </ButtonLink>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
