import type { Id } from "@reflet/backend/convex/_generated/dataModel";

/**
 * Build query args for the feedback list, delegating "hide completed"
 * filtering to the backend instead of relying on a fragile client-side
 * heuristic based on status order.
 */
export function buildFeedbackQueryArgs(
  organizationId: Id<"organizations">,
  searchQuery: string,
  sortBy: "votes" | "newest" | "oldest" | "comments",
  selectedStatusIds: Id<"organizationStatuses">[],
  hideCompleted: boolean
) {
  const hasExplicitStatusFilter = selectedStatusIds.length > 0;
  return {
    organizationId,
    search: searchQuery.trim() || undefined,
    sortBy,
    statusIds: hasExplicitStatusFilter ? selectedStatusIds : undefined,
    hideCompleted: (hideCompleted && !hasExplicitStatusFilter) || undefined,
  };
}
