import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { getOrgTier } from "../billing/org_subscription";
import { PLAN_LIMITS } from "../billing/queries";
import { isOrgMemberViewer, requireAuthUser } from "../shared/access";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_URL_LENGTH,
} from "../shared/constants";
import { rateLimiter } from "../shared/rate_limits";
import { validateInputLength } from "../shared/validators";
import { scheduleAfterCreate } from "./after_create";
import { archiveFeedback } from "./archive_feedback";
import { getFeedbackCategories } from "./categories/visibility";
import {
  isFeedbackPubliclyVisible,
  projectFeedbackFor,
} from "./public_projection";
import { statusFieldsFor } from "./status_target";

const MAX_PUBLIC_ATTACHMENTS = 10;

export const listPublic = query({
  args: {
    limit: v.optional(v.number()),
    organizationId: v.id("organizations"),
    sortBy: v.optional(
      v.union(
        v.literal("votes"),
        v.literal("newest"),
        v.literal("oldest"),
        v.literal("comments")
      )
    ),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org?.isPublic) {
      return [];
    }

    const user = await authComponent.safeGetAuthUser(ctx);
    const isMember = await isOrgMemberViewer(ctx, args.organizationId);

    let feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    feedbackItems = feedbackItems.filter(
      (f) => isFeedbackPubliclyVisible(org, f) && !f.isMerged
    );

    const sortBy = args.sortBy || "votes";
    switch (sortBy) {
      case "votes":
        feedbackItems.sort((a, b) => b.voteCount - a.voteCount);
        break;
      case "newest":
        feedbackItems.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "oldest":
        feedbackItems.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case "comments":
        feedbackItems.sort((a, b) => b.commentCount - a.commentCount);
        break;
      default:
        break;
    }

    feedbackItems.sort((a, b) => {
      if (a.isPinned && !b.isPinned) {
        return -1;
      }
      if (!a.isPinned && b.isPinned) {
        return 1;
      }
      return 0;
    });

    if (args.limit) {
      feedbackItems = feedbackItems.slice(0, args.limit);
    }

    const feedbackWithDetails = await Promise.all(
      feedbackItems.map(async (f) => {
        const tags = await getFeedbackCategories(ctx, f._id, isMember);

        let hasVoted = false;
        if (user) {
          const vote = await ctx.db
            .query("feedbackVotes")
            .withIndex("by_feedback_user", (q) =>
              q.eq("feedbackId", f._id).eq("userId", user._id)
            )
            .unique();
          hasVoted = !!vote;
        }

        return {
          ...projectFeedbackFor(f, isMember),
          hasVoted,
          tags,
        };
      })
    );

    return feedbackWithDetails;
  },
});

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
    validateInputLength(args.title, MAX_TITLE_LENGTH, "Title");
    validateInputLength(
      args.description,
      MAX_DESCRIPTION_LENGTH,
      "Description"
    );
    validateInputLength(args.email, MAX_EMAIL_LENGTH, "Email");
    const attachments = args.attachments ?? [];
    if (attachments.length > MAX_PUBLIC_ATTACHMENTS) {
      throw new Error(`At most ${MAX_PUBLIC_ATTACHMENTS} attachments allowed`);
    }
    for (const url of attachments) {
      validateInputLength(url, MAX_URL_LENGTH, "Attachment URL");
    }
    await rateLimiter.limit(ctx, "anonymousFeedbackPerOrg", {
      key: args.organizationId,
      throws: true,
    });

    const existingFeedback = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const activeFeedback = existingFeedback.filter((f) => !f.deletedAt);

    const tier = await getOrgTier(ctx, org._id);
    const limit = PLAN_LIMITS[tier].maxFeedback;
    if (activeFeedback.length >= limit) {
      throw new Error(
        `Feedback limit reached. This organization allows ${limit} feedback items.`
      );
    }

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
