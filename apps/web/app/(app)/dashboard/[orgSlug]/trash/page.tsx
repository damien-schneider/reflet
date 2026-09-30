"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import {
  PageBody,
  PageDescription,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { toast } from "@ctrl-ui/react/ui/toast";
import { ArrowCounterClockwise, Trash } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { format, formatDistanceToNow } from "date-fns";
import { use, useState } from "react";
import { OrgNotFound } from "@/features/dashboard/components/org-not-found";

const SKELETON_ROWS = ["a", "b", "c"] as const;
const URGENT_DAYS_REMAINING = 3;

function TrashSkeleton() {
  return (
    <ul aria-busy="true" className="space-y-2">
      <li className="sr-only">Loading deleted feedback…</li>
      {SKELETON_ROWS.map((row) => (
        <li
          className="flex items-center justify-between gap-4 rounded-lg border p-4"
          key={row}
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-7 w-20" />
        </li>
      ))}
    </ul>
  );
}

function TrashEmpty() {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia>
          <Trash aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>Trash is empty</EmptyTitle>
        <EmptyDescription className="text-pretty">
          Deleted feedback lands here for 30 days, so you can restore it if you
          change your mind.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export default function TrashPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const deletedFeedback = useQuery(
    api.feedback.trash.listDeleted,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const restoreFeedback = useMutation(api.feedback.actions.restore);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleRestore = async (feedbackId: Id<"feedback">) => {
    setRestoringId(feedbackId);
    try {
      await restoreFeedback({ id: feedbackId });
    } catch {
      toast.error("Couldn’t restore this feedback. Try again.");
    }
    setRestoringId(null);
  };

  const renderBody = () => {
    if (deletedFeedback === undefined) {
      return <TrashSkeleton />;
    }
    if (deletedFeedback.length === 0) {
      return <TrashEmpty />;
    }
    return (
      <ul className="space-y-2">
        {deletedFeedback.map((feedback) => {
          const isRestoring = restoringId === feedback._id;
          return (
            <li
              className="flex items-center justify-between gap-4 rounded-lg border p-4"
              key={feedback._id}
            >
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-medium text-sm">
                  {feedback.title}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
                  {feedback.deletedAt ? (
                    <time
                      dateTime={new Date(feedback.deletedAt).toISOString()}
                      title={format(feedback.deletedAt, "PPpp")}
                    >
                      Deleted{" "}
                      {formatDistanceToNow(feedback.deletedAt, {
                        addSuffix: true,
                      })}
                    </time>
                  ) : null}
                  <Badge
                    className="tabular-nums"
                    color={
                      feedback.daysRemaining <= URGENT_DAYS_REMAINING
                        ? "orange"
                        : "neutral"
                    }
                    variant="outline"
                  >
                    {feedback.daysRemaining === 1
                      ? "1 day left"
                      : `${feedback.daysRemaining} days left`}
                  </Badge>
                </div>
              </div>
              <Button
                aria-label={`Restore ${feedback.title}`}
                disabled={isRestoring}
                onClick={() => handleRestore(feedback._id)}
                size="sm"
                variant="surface"
              >
                {isRestoring ? (
                  <Spinner data-icon="inline-start" size="xs" />
                ) : (
                  <ArrowCounterClockwise
                    aria-hidden="true"
                    className="size-4"
                    data-icon="inline-start"
                  />
                )}
                {isRestoring ? "Restoring…" : "Restore"}
              </Button>
            </li>
          );
        })}
      </ul>
    );
  };

  if (org === null) {
    return <OrgNotFound />;
  }

  return (
    <PageLayout scroll="page" width="content">
      <PageHeader>
        <PageTitle>Trash</PageTitle>
        <PageDescription>
          Deleted feedback is removed for good after 30 days. Restore anything
          you still need.
        </PageDescription>
      </PageHeader>
      <PageBody>{renderBody()}</PageBody>
    </PageLayout>
  );
}
