"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@ctrl-ui/react/ui/card";
import { toast } from "@ctrl-ui/react/ui/toast";
import { ArrowSquareOut, CheckCircle, Trash } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { clarificationValue } from "@reflet/backend/convex/feedback/property_values";
import { WITHHOLD_JUNK_THRESHOLD } from "@reflet/backend/convex/feedback/triage_questions";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { AiMiniIndicator } from "./ai-mini-indicator";
import {
  AllCaughtUp,
  ReviewQueueSkeleton,
  ReviewSectionHeader,
  StatusAnnouncer,
} from "./review-queue-parts";

const PERCENTAGE_SCALE = 100;
const LOW_USEFULNESS_PERCENTAGE = 25;
const MEDIUM_USEFULNESS_PERCENTAGE = 50;

const SOURCE_LABELS = {
  api: "API",
  web: "Web",
  widget: "Widget",
} as const;

interface PendingItem {
  _id: Id<"feedback">;
  aiJunk?: number;
  aiNeedsReview?: number;
  aiUsefulness?: number;
  createdAt: number;
  description?: string;
  needsClarification?: boolean;
  source?: keyof typeof SOURCE_LABELS;
  title: string;
}

type PendingAction = "approve" | "dismiss";

interface PendingReviewPanelProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
}

function usefulnessType(percentage: number) {
  if (percentage < LOW_USEFULNESS_PERCENTAGE) {
    return "none";
  }
  if (percentage < MEDIUM_USEFULNESS_PERCENTAGE) {
    return "medium";
  }
  return "high";
}

function HoldReason({
  junk,
  usefulness,
}: {
  junk?: number;
  usefulness?: number;
}) {
  if (junk !== undefined && junk >= WITHHOLD_JUNK_THRESHOLD) {
    return (
      <AiMiniIndicator
        label={`JEV suggests rejection · ${Math.round(junk * PERCENTAGE_SCALE)}%`}
        type="high"
      />
    );
  }

  if (usefulness === undefined) {
    return null;
  }

  const percentage = Math.round(usefulness * PERCENTAGE_SCALE);
  return (
    <AiMiniIndicator
      label={`${percentage}% useful`}
      type={usefulnessType(percentage)}
    />
  );
}

interface PendingReviewCardProps {
  canApprove: boolean;
  disabled: boolean;
  item: PendingItem;
  onApprove: () => void;
  onDismiss: () => void;
  orgSlug: string;
  pendingAction: PendingAction | null;
}

function PendingReviewCard({
  canApprove,
  disabled,
  item,
  onApprove,
  onDismiss,
  orgSlug,
  pendingAction,
}: PendingReviewCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="text-pretty font-medium text-sm leading-tight">
              {item.title}
            </h3>
            <CardDescription>
              Submitted{" "}
              {formatDistanceToNow(item.createdAt, { addSuffix: true })}
              {item.source && ` · ${SOURCE_LABELS[item.source]}`}
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <HoldReason junk={item.aiJunk} usefulness={item.aiUsefulness} />
            {clarificationValue(item).value && (
              <Badge size="sm" variant="outline">
                Needs clarification
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {item.description ? (
          <p className="line-clamp-2 text-pretty text-muted-foreground text-sm">
            {item.description}
          </p>
        ) : (
          <Badge variant="outline">No description</Badge>
        )}

        <div className="flex items-center gap-2 border-t pt-3">
          {canApprove && (
            <>
              <Button
                aria-label={`Approve ${item.title}`}
                disabled={disabled}
                onClick={onApprove}
                size="xs"
                tone="primary"
                variant="solid"
              >
                <CheckCircle aria-hidden className="size-3.5" />
                {pendingAction === "approve" ? "Approving…" : "Approve"}
              </Button>
              <Button
                aria-label={`Reject ${item.title}`}
                disabled={disabled}
                onClick={onDismiss}
                size="xs"
                tone="danger"
                variant="ghost"
              >
                <Trash aria-hidden className="size-3.5" />
                {pendingAction === "dismiss" ? "Archiving…" : "Reject"}
              </Button>
            </>
          )}
          <ButtonLink
            aria-label={`Open ${item.title}`}
            className="ml-auto"
            render={
              <Link href={`/dashboard/${orgSlug}/feedback/${item._id}`} />
            }
            size="xs"
            variant="ghost"
          >
            <ArrowSquareOut aria-hidden className="size-3.5" />
            Open
          </ButtonLink>
        </div>
      </CardContent>
    </Card>
  );
}

function DismissConfirmDialog({
  item,
  onClose,
  onConfirm,
}: {
  item: PendingItem | null;
  onClose: () => void;
  onConfirm: (item: PendingItem) => void;
}) {
  return (
    <DestructiveConfirmDialog
      confirmLabel="Reject and archive"
      description={
        <>
          “{item?.title}” will be rejected for publication and archived in
          Trash. An admin can restore it.
        </>
      }
      onConfirm={() => item && onConfirm(item)}
      onOpenChange={(open) => !open && onClose()}
      open={item !== null}
      title="Reject this feedback?"
    />
  );
}

function usePendingReviewActions() {
  const setPublication = useMutation(api.feedback.publication.setState);
  const [pending, setPending] = useState<{
    action: PendingAction;
    id: Id<"feedback">;
  } | null>(null);
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const run = async (
    item: PendingItem,
    action: PendingAction,
    doneLabel: string
  ) => {
    setPending({ action, id: item._id });
    try {
      if (action === "approve") {
        await setPublication({ feedbackId: item._id, state: "approved" });
      } else {
        await setPublication({ feedbackId: item._id, state: "rejected" });
      }
      setAnnouncement(`${doneLabel} “${item.title}”`);
    } catch {
      toast.error(`Couldn’t ${action} “${item.title}”. Try again.`);
    }
    setPending(null);
  };

  const approveAll = async (items: PendingItem[]) => {
    setIsApprovingAll(true);
    const results = await Promise.allSettled(
      items.map((item) =>
        setPublication({ feedbackId: item._id, state: "approved" })
      )
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      toast.error(`Couldn’t approve ${failed} of ${items.length}. Try again.`);
    } else {
      setAnnouncement(`Approved ${items.length} items`);
    }
    setIsApprovingAll(false);
  };

  return {
    announcement,
    approve: (item: PendingItem) => run(item, "approve", "Approved"),
    approveAll,
    dismiss: (item: PendingItem) => run(item, "dismiss", "Dismissed"),
    isApprovingAll,
    pending,
  };
}

export function PendingReviewPanel({
  organizationId,
  orgSlug,
}: PendingReviewPanelProps) {
  const pendingReview = useQuery(api.feedback.review.listPendingReview, {
    organizationId,
  });
  const actions = usePendingReviewActions();
  const [dismissTarget, setDismissTarget] = useState<PendingItem | null>(null);

  if (pendingReview === undefined) {
    return <ReviewQueueSkeleton />;
  }

  const { canApprove, items } = pendingReview;
  const showApproveAll = canApprove && items.length > 1;

  return (
    <section className="space-y-4">
      <ReviewSectionHeader
        action={
          showApproveAll && (
            <Button
              disabled={actions.isApprovingAll || actions.pending !== null}
              onClick={() => actions.approveAll(items)}
              size="xs"
              variant="surface"
            >
              <CheckCircle aria-hidden className="size-3.5" />
              {actions.isApprovingAll
                ? "Approving…"
                : `Approve all ${items.length}`}
            </Button>
          )
        }
        count={items.length}
        title="Pending review"
      />

      {items.length === 0 ? (
        <AllCaughtUp description="Feedback the AI holds back for a human check shows up here." />
      ) : (
        items.map((item) => (
          <PendingReviewCard
            canApprove={canApprove}
            disabled={
              actions.isApprovingAll || actions.pending?.id === item._id
            }
            item={item}
            key={item._id}
            onApprove={() => actions.approve(item)}
            onDismiss={() => setDismissTarget(item)}
            orgSlug={orgSlug}
            pendingAction={
              actions.pending?.id === item._id ? actions.pending.action : null
            }
          />
        ))
      )}

      <DismissConfirmDialog
        item={dismissTarget}
        onClose={() => setDismissTarget(null)}
        onConfirm={actions.dismiss}
      />
      <StatusAnnouncer message={actions.announcement} />
    </section>
  );
}
