import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function archiveFeedback(
  ctx: MutationCtx,
  feedbackId: Id<"feedback">
) {
  const now = Date.now();
  await ctx.db.patch(feedbackId, { deletedAt: now, updatedAt: now });
}
