"use client";

import { ArrowCounterClockwise, Spinner, Trash } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { use, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { H1, Muted } from "@/components/ui/typography";

export default function TrashPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const deletedFeedback = useQuery(
    api.feedback_trash.listDeleted,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const restoreFeedback = useMutation(api.feedback_actions.restore);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleRestore = async (feedbackId: Id<"feedback">) => {
    setRestoringId(feedbackId);
    try {
      await restoreFeedback({ id: feedbackId });
    } finally {
      setRestoringId(null);
    }
  };

  if (!org) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <H1>Trash</H1>
        <Muted>Deleted items are permanently removed after 30 days.</Muted>
      </div>

      {deletedFeedback === undefined && (
        <div className="flex items-center justify-center py-12">
          <Spinner className="animate-spin" />
        </div>
      )}

      {deletedFeedback?.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
          <Trash className="size-10" />
          <p className="text-sm">No deleted feedback</p>
        </div>
      )}

      {deletedFeedback && deletedFeedback.length > 0 && (
        <div className="space-y-2">
          {deletedFeedback.map((feedback) => (
            <div
              className="flex items-center justify-between gap-4 rounded-lg border p-4"
              key={feedback._id}
            >
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-medium text-sm">
                  {feedback.title}
                </h3>
                <div className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
                  {feedback.deletedAt && (
                    <span>
                      Deleted{" "}
                      {formatDistanceToNow(feedback.deletedAt, {
                        addSuffix: true,
                      })}
                    </span>
                  )}
                  <span>
                    <Badge variant="outline">
                      {feedback.daysRemaining}d remaining
                    </Badge>
                  </span>
                </div>
              </div>
              <Button
                disabled={restoringId === feedback._id}
                onClick={() => handleRestore(feedback._id)}
                size="sm"
                variant="outline"
              >
                {restoringId === feedback._id ? (
                  <Spinner className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <ArrowCounterClockwise className="mr-1.5 size-3.5" />
                )}
                Restore
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
