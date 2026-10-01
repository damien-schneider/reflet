import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { categoryIsPublic } from "./audience";

export function categoryVisibleToViewer<T extends Doc<"tags">>(
  tag: T | null,
  isMember: boolean
): tag is T {
  return tag !== null && (isMember || categoryIsPublic(tag));
}

export async function getFeedbackCategories(
  ctx: QueryCtx,
  feedbackId: Id<"feedback">,
  isMember: boolean
) {
  const links = await ctx.db
    .query("feedbackTags")
    .withIndex("by_feedback", (q) => q.eq("feedbackId", feedbackId))
    .collect();
  const tags = await Promise.all(
    links.map(async (link) => {
      const tag = await ctx.db.get(link.tagId);
      return categoryVisibleToViewer(tag, isMember)
        ? { ...tag, appliedByAi: link.appliedByAi ?? false }
        : null;
    })
  );
  return tags.filter((tag): tag is NonNullable<typeof tag> => tag !== null);
}
