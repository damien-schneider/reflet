"use client";

import { CaretUp, ChatCircle } from "@phosphor-icons/react";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { FeedbackItem } from "./feed-feedback-view";
import { AddColumnInline } from "./roadmap/add-column-inline";
import { ColumnDeleteDialog } from "./roadmap/column-delete-dialog";
import { RoadmapColumnHeader } from "./roadmap/roadmap-column-header";

export interface RoadmapViewProps {
  feedback: FeedbackItem[];
  statuses: Array<{ _id: string; name: string; color: string }>;
  onFeedbackClick: (feedbackId: string) => void;
  organizationId: Id<"organizations">;
  isAdmin: boolean;
}

export function RoadmapView({
  feedback,
  statuses,
  onFeedbackClick,
  organizationId,
  isAdmin,
}: RoadmapViewProps) {
  const [deleteDialogStatus, setDeleteDialogStatus] = useState<{
    id: Id<"organizationStatuses">;
    name: string;
    color: string;
  } | null>(null);

  if (statuses.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            No statuses configured. Statuses are used as roadmap columns.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statuses.map((status) => {
          // Filter feedback by status
          const statusFeedback = feedback.filter(
            (f) => f.organizationStatusId === status._id
          );

          return (
            <div
              className="group w-72 shrink-0 rounded-lg border bg-muted/30 p-4"
              key={status._id}
            >
              <RoadmapColumnHeader
                color={status.color}
                count={statusFeedback.length}
                isAdmin={isAdmin}
                name={status.name}
                onDelete={() =>
                  setDeleteDialogStatus({
                    id: status._id as Id<"organizationStatuses">,
                    name: status.name,
                    color: status.color,
                  })
                }
                statusId={status._id as Id<"organizationStatuses">}
              />
              <div className="space-y-2">
                {statusFeedback.map((item) => (
                  <Card
                    className="cursor-pointer p-3 transition-all hover:border-primary/50"
                    key={item._id}
                    onClick={() => onFeedbackClick(item._id)}
                  >
                    <h4 className="font-medium text-sm">{item.title}</h4>
                    {/* Show tags for categorization */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.tags.slice(0, 2).map(
                          (tag) =>
                            tag && (
                              <Badge
                                className="px-1 py-0 font-normal text-xs"
                                key={tag._id}
                                style={{
                                  backgroundColor: `${tag.color}15`,
                                  color: tag.color,
                                  borderColor: `${tag.color}30`,
                                }}
                                variant="outline"
                              >
                                {tag.name}
                              </Badge>
                            )
                        )}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-muted-foreground text-xs">
                      <CaretUp className="h-3 w-3" />
                      <span>{item.voteCount}</span>
                      <ChatCircle className="ml-2 h-3 w-3" />
                      <span>{item.commentCount}</span>
                    </div>
                  </Card>
                ))}
                {statusFeedback.length === 0 && (
                  <p className="py-4 text-center text-muted-foreground text-sm">
                    No items
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Add column button for admins */}
        {isAdmin && <AddColumnInline organizationId={organizationId} />}
      </div>

      {/* Delete confirmation dialog */}
      <ColumnDeleteDialog
        feedbackCount={
          deleteDialogStatus
            ? feedback.filter(
                (f) => f.organizationStatusId === deleteDialogStatus.id
              ).length
            : 0
        }
        onOpenChange={(open) => !open && setDeleteDialogStatus(null)}
        open={!!deleteDialogStatus}
        otherStatuses={statuses.filter((s) => s._id !== deleteDialogStatus?.id)}
        statusToDelete={deleteDialogStatus}
      />
    </>
  );
}
