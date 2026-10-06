import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { requireAuthUser } from "../shared/access";
import { MAX_EMAIL_LENGTH } from "../shared/constants";
import { rateLimiter } from "../shared/rate_limits";
import { validateInputLength } from "../shared/validators";
import { scheduleAfterCreate } from "./after_create";
import { archiveFeedback } from "./archive_feedback";
import { statusFieldsFor } from "./status_target";
import {
  enforceFeedbackLimit,
  validateFeedbackSubmission,
} from "./submission_limits";

export const createPublicOrg = mutation({
  args: {
    attachments: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    email: v.optional(v.string()),
    organizationId: v.id("organizations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org?.isPublic) {
      throw new Error("Organization not found or not public");
    }
    validateFeedbackSubmission(args);
    validateInputLength(args.email, MAX_EMAIL_LENGTH, "Email");
    await rateLimiter.limit(ctx, "anonymousFeedbackPerOrg", {
      key: args.organizationId,
      throws: true,
    });
    await enforceFeedbackLimit(ctx, org._id);

    const user = await authComponent.safeGetAuthUser(ctx);
    const now = Date.now();

    const isApproved = false;
    const feedbackId = await ctx.db.insert("feedback", {
      attachments: args.attachments,
      authorId: user?._id || `anonymous:${args.email || "unknown"}`,
      commentCount: 0,
      createdAt: now,
      description: args.description || "",
      isApproved,
      isPinned: false,
      organizationId: args.organizationId,
      ...(await statusFieldsFor(ctx, {
        organizationId: args.organizationId,
        status: org.feedbackSettings?.defaultStatus ?? "open",
      })),
      title: args.title,
      updatedAt: now,
      voteCount: 0,
    });

    await scheduleAfterCreate(ctx, feedbackId, {
      aiEnrichment: true,
      autoTagging: true,
    });

    return feedbackId;
  },
});

export const togglePin = mutation({
  args: { id: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    const feedback = await ctx.db.get(args.id);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can pin/unpin feedback");
    }

    await ctx.db.patch(args.id, {
      isPinned: !feedback.isPinned,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

export const remove = mutation({
  args: { id: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    const feedback = await ctx.db.get(args.id);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    if (feedback.deletedAt) {
      throw new Error("Feedback is already deleted");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    const isAdmin =
      membership?.role === "admin" || membership?.role === "owner";
    const isAuthor = feedback.authorId === user._id;

    if (!(isAdmin || isAuthor)) {
      throw new Error("You don't have permission to delete this feedback");
    }

    await archiveFeedback(ctx, args.id);

    return true;
  },
});

export const restore = mutation({
  args: { id: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);

    const feedback = await ctx.db.get(args.id);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    if (!feedback.deletedAt) {
      throw new Error("Feedback is not deleted");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (
      !membership ||
      (membership.role !== "admin" && membership.role !== "owner")
    ) {
      throw new Error("Only admins can restore feedback");
    }

    await ctx.db.patch(args.id, {
      deletedAt: undefined,
      updatedAt: Date.now(),
    });

    return true;
  },
});
