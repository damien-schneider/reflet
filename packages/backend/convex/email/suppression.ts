import { v } from "convex/values";
import { internalQuery, mutation, query } from "../_generated/server";
import { assertSuperAdmin } from "../shared/access";
import { isValidEmail } from "../shared/validators";

const LIST_LIMIT = 200;

export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

export const isEmailSuppressed = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const suppression = await ctx.db
      .query("emailSuppressions")
      .withIndex("by_email", (q) => q.eq("email", normalizeEmail(args.email)))
      .first();

    return suppression !== null;
  },
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
      originalEventType: v.string(),
      reason: v.union(
        v.literal("hard_bounce"),
        v.literal("complaint"),
        v.literal("manual")
      ),
      suppressedAt: v.number(),
    })
  ),
});

export const addSuppression = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    await assertSuperAdmin(ctx);

    const normalizedEmail = normalizeEmail(args.email);
    if (!isValidEmail(normalizedEmail)) {
      throw new Error("Invalid email address");
    }

    const existing = await ctx.db
      .query("emailSuppressions")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("emailSuppressions", {
      email: normalizedEmail,
      originalEventType: "manual",
      reason: "manual",
      suppressedAt: Date.now(),
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
      throw new Error("Suppression not found");
    }

    await ctx.db.delete(args.suppressionId);
    return null;
  },
  returns: v.null(),
});
