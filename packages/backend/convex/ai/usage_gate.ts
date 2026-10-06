import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation, mutation } from "../_generated/server";
import { requireAuthUser } from "../shared/access";
import { getOrgMembership, isOrgAdmin } from "../shared/membership";
import { rateLimiter } from "../shared/rate_limits";
import { AI_ACCESS_DENIED } from "./constants";

export const consumeAiGenerationFor = async (
  ctx: MutationCtx,
  {
    organizationId,
    userId,
  }: { organizationId: Id<"organizations">; userId: string }
): Promise<null> => {
  const membership = await getOrgMembership(ctx, organizationId, userId);
  if (!isOrgAdmin(membership?.role)) {
    throw new ConvexError({
      kind: AI_ACCESS_DENIED,
      message: "Only admins can use AI generation",
    });
  }
  await rateLimiter.limit(ctx, "aiGenerationPerUser", {
    key: userId,
    throws: true,
  });
  await rateLimiter.limit(ctx, "aiGenerationPerOrg", {
    key: organizationId,
    throws: true,
  });
  return null;
};

export const consumeAiGeneration = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    return await consumeAiGenerationFor(ctx, {
      organizationId: args.organizationId,
      userId: user._id,
    });
  },
  returns: v.null(),
});

export const consumeAiGenerationForUser = internalMutation({
  args: { organizationId: v.id("organizations"), userId: v.string() },
  handler: async (ctx, args) => await consumeAiGenerationFor(ctx, args),
  returns: v.null(),
});
