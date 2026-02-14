import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useAtomValue } from "jotai";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedbackFunnels } from "@/features/feedback/components/feedback-filters";
import { FeedbackListItem } from "@/features/feedback/components/feedback-list-item";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  feedbackMagnifyingGlassAtom,
  feedbackSortAtom,
  selectedStatusIdsAtom,
  selectedTagIdsAtom,
} from "@/store/feedback";

interface FeedbackListProps {
  organizationId: Id<"organizations">;
  onFeedbackClick?: (feedbackId: Id<"feedback">) => void;
  className?: string;
  isAdmin?: boolean;
}

export function FeedbackList({
  organizationId,
  onFeedbackClick,
  className,
  isAdmin = false,
}: FeedbackListProps) {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  // Get filter state from Jotai atoms
  const search = useAtomValue(feedbackMagnifyingGlassAtom);
  const sortBy = useAtomValue(feedbackSortAtom);
  const selectedStatusIds = useAtomValue(selectedStatusIdsAtom);
  const selectedTagIds = useAtomValue(selectedTagIdsAtom);

  // Map sort option to Convex sort type
  const convexSortBy = (() => {
    switch (sortBy) {
      case "most_votes":
        return "votes" as const;
      case "most_comments":
        return "comments" as const;
      default:
        return sortBy;
    }
  })();

  // Query feedback from Convex
  const feedbackList = useQuery(api.feedback_list.listByOrganization, {
    organizationId,
    search: search || undefined,
    sortBy: convexSortBy,
    statusIds: selectedStatusIds.length > 0 ? selectedStatusIds : undefined,
    tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
  });

  // Get tags for the board's organization
  const tags = useQuery(api.tag_manager.list, { organizationId });

  const isLoading = feedbackList === undefined;

  return (
    <div className={cn("space-y-6", className)}>
      <FeedbackFunnels organizationId={organizationId} tags={tags ?? []} />

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
            {search || selectedStatusIds.length > 0 || selectedTagIds.length > 0
              ? "No feedback matches your filters"
              : "No feedback yet. Be the first to share your thoughts!"}
          </p>
        </div>
      )}

      {/* Feedback list */}
      {!isLoading && feedbackList && feedbackList.length > 0 && (
        <div className="space-y-3">
          {feedbackList.map((feedback) => {
            // Filter out null tags for type safety
            const nonNullTags = feedback.tags?.filter(
              (tag): tag is NonNullable<typeof tag> => tag !== null
            );
            return (
              <FeedbackListItem
                feedback={{ ...feedback, tags: nonNullTags }}
                isAdmin={isAdmin}
                isAuthor={feedback.authorId === userId}
                key={feedback._id}
                onClick={onFeedbackClick}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
