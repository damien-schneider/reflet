import { ConvexError, type Infer, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import {
  internalQuery,
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "../_generated/server";
import { assertSuperAdmin } from "../shared/access";
import { isValidEmail } from "../shared/validators";
import { suppressionReason } from "./tableFields";

const LIST_LIMIT = 200;

export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

const findSuppression = (
  ctx: QueryCtx,
  email: string,
  organizationId: Id<"organizations"> | undefined
) =>
  ctx.db
    .query("emailSuppressions")
    .withIndex("by_email_org", (q) =>
      q.eq("email", normalizeEmail(email)).eq("organizationId", organizationId)
    )
    .first();

export const isSupportRecipientSuppressed = async (
  ctx: QueryCtx,
  email: string,
  organizationId: Id<"organizations">
): Promise<boolean> =>
  (await findSuppression(ctx, email, undefined)) !== null ||
  (await findSuppression(ctx, email, organizationId)) !== null;

export const addSuppressionOnce = async (
  ctx: MutationCtx,
  suppression: {
    email: string;
    organizationId?: Id<"organizations">;
    originalEventType: string;
    reason: Infer<typeof suppressionReason>;
  }
): Promise<Id<"emailSuppressions">> => {
  const existing = await findSuppression(
    ctx,
    suppression.email,
    suppression.organizationId
  );
  if (existing) {
    return existing._id;
  }
  return await ctx.db.insert("emailSuppressions", {
    ...suppression,
    email: normalizeEmail(suppression.email),
    suppressedAt: Date.now(),
  });
};

export const isEmailSuppressed = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) =>
    (await findSuppression(ctx, args.email, undefined)) !== null,
  returns: v.boolean(),
});

export const listSuppressions = query({
  args: {},
  handler: async (ctx) => {
    await assertSuperAdmin(ctx);
    return await ctx.db
      .query("emailSuppressions")
      .order("desc")
      .take(LIST_LIMIT);
  },
  returns: v.array(
    v.object({
      _creationTime: v.number(),
      _id: v.id("emailSuppressions"),
      email: v.string(),
      organizationId: v.optional(v.id("organizations")),
      originalEventType: v.string(),
      reason: suppressionReason,
      suppressedAt: v.number(),
    })
  ),
});

export const addSuppression = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    await assertSuperAdmin(ctx);

    if (!isValidEmail(normalizeEmail(args.email))) {
      throw new ConvexError({
        code: "INVALID_EMAIL",
        message: "Invalid email address",
      });
    }

    return await addSuppressionOnce(ctx, {
      email: args.email,
      originalEventType: "manual",
      reason: "manual",
    });
  },
  returns: v.id("emailSuppressions"),
});

export const removeSuppression = mutation({
  args: { suppressionId: v.id("emailSuppressions") },
  handler: async (ctx, args) => {
    await assertSuperAdmin(ctx);

    const suppression = await ctx.db.get(args.suppressionId);
    if (!suppression) {
      throw new ConvexError({
        code: "SUPPRESSION_NOT_FOUND",
        message: "Suppression not found",
      });
    }

    await ctx.db.delete(args.suppressionId);
    return null;
  },
  returns: v.null(),
});
