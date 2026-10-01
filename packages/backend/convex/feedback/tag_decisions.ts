import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function confirmTag(
  ctx: MutationCtx,
  feedback: Doc<"feedback">,
  tagId: Id<"tags">
) {
  const tag = await ctx.db.get(tagId);
  if (tag?.organizationId !== feedback.organizationId) {
    throw new Error("Tag does not belong to this organization");
  }
  const link = await ctx.db
    .query("feedbackTags")
    .withIndex("by_feedback_tag", (query) =>
      query.eq("feedbackId", feedback._id).eq("tagId", tagId)
    )
    .unique();
  await ctx.db.patch(feedback._id, {
    aiTagExclusions: feedback.aiTagExclusions?.filter((id) => id !== tagId),
    updatedAt: Date.now(),
  });
  if (link) {
    await ctx.db.patch(link._id, { appliedByAi: false });
    return link._id;
  }
  return ctx.db.insert("feedbackTags", {
    appliedByAi: false,
    feedbackId: feedback._id,
    tagId,
  });
}

export async function refuseTag(
  ctx: MutationCtx,
  feedback: Doc<"feedback">,
  tagId: Id<"tags">
) {
  const tag = await ctx.db.get(tagId);
  if (tag?.organizationId !== feedback.organizationId) {
    throw new Error("Tag does not belong to this organization");
  }
  const link = await ctx.db
    .query("feedbackTags")
    .withIndex("by_feedback_tag", (query) =>
      query.eq("feedbackId", feedback._id).eq("tagId", tagId)
    )
    .unique();
  await ctx.db.patch(feedback._id, {
    aiTagExclusions: [...new Set([...(feedback.aiTagExclusions ?? []), tagId])],
    updatedAt: Date.now(),
  });
  if (link) {
    await ctx.db.delete(link._id);
  }
}
