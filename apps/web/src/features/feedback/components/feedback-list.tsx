import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useAtomValue } from "jotai";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedbackFilters } from "@/features/feedback/components/feedback-filters";
import { FeedbackListItem } from "@/features/feedback/components/feedback-list-item";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  feedbackSearchAtom,
  feedbackSortAtom,
  selectedStatusesAtom,
  selectedTagIdsAtom,
} from "@/store/feedback";

interface FeedbackListProps {
  boardId: Id<"boards">;
  organizationId: Id<"organizations">;
  onFeedbackClick?: (feedbackId: Id<"feedback">) => void;
  className?: string;
  isAdmin?: boolean;
}

export function FeedbackList({
  boardId,
  organizationId,
  onFeedbackClick,
  className,
  isAdmin = false,
}: FeedbackListProps) {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  // Get filter state from Jotai atoms
  const search = useAtomValue(feedbackSearchAtom);
  const sortBy = useAtomValue(feedbackSortAtom);
  const selectedStatuses = useAtomValue(selectedStatusesAtom);
  const selectedTagIds = useAtomValue(selectedTagIdsAtom);

  // Map sort option to Convex sort type
  const convexSortBy = (() => {
    switch (sortBy) {
      case "most_votes":
        return "votes" as const;
      case "most_comments":
        return "comments" as const;
      default:
        return sortBy as "newest" | "oldest";
    }
  })();

  // Query feedback from Convex
  const feedbackList = useQuery(api.feedback_list.list, {
    boardId,
    search: search || undefined,
    sortBy: convexSortBy,
    status: selectedStatuses[0] as Doc<"feedback">["status"],
    tagIds:
      selectedTagIds.length > 0 ? (selectedTagIds as Id<"tags">[]) : undefined,
  });

  // Get tags for the board's organization
  const tags = useQuery(api.tag_manager.list, { organizationId });

  const isLoading = feedbackList === undefined;

  return (
    <div className={cn("space-y-6", className)}>
      <FeedbackFilters organizationId={organizationId} tags={tags ?? []} />

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div className="flex gap-4 rounded-lg border p-4" key={i}>
              <Skeleton className="h-10 w-12" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && feedbackList?.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            {search || selectedStatuses.length > 0 || selectedTagIds.length > 0
              ? "No feedback matches your filters"
              : "No feedback yet. Be the first to share your thoughts!"}
          </p>
        </div>
      )}

      {/* Feedback list */}
      {!isLoading && feedbackList && feedbackList.length > 0 && (
        <div className="space-y-3">
          {feedbackList.map((feedback) => (
            <FeedbackListItem
              boardId={boardId}
              feedback={feedback}
              isAdmin={isAdmin}
              isAuthor={feedback.authorId === userId}
              key={feedback._id}
              onClick={onFeedbackClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
