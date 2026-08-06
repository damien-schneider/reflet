import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { PLAN_LIMITS } from "../organizations/queries";
import { getAuthUser } from "../shared/utils";

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

    // Get approved feedback only
    let feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    feedbackItems = feedbackItems.filter(
      (f) => f.isApproved && !f.deletedAt && !f.isMerged
    );

    // Sort
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

    // Pinned items first
    feedbackItems.sort((a, b) => {
      if (a.isPinned && !b.isPinned) {
        return -1;
      }
      if (!a.isPinned && b.isPinned) {
        return 1;
      }
      return 0;
    });

    // Limit
    if (args.limit) {
      feedbackItems = feedbackItems.slice(0, args.limit);
    }

    // Add tags and vote status
    const feedbackWithDetails = await Promise.all(
      feedbackItems.map(async (f) => {
        // Get tags
        const feedbackTags = await ctx.db
          .query("feedbackTags")
          .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
          .collect();
        const tags = await Promise.all(
          feedbackTags.map(async (ft) => ctx.db.get(ft.tagId))
        );

        // Check if user voted
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
          ...f,
          hasVoted,
          tags: tags.filter(Boolean),
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

    // Check feedback limit (excluding soft-deleted)
    const existingFeedback = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const activeFeedback = existingFeedback.filter((f) => !f.deletedAt);

    const limit = PLAN_LIMITS[org.subscriptionTier].maxFeedbackPerBoard;
    if (activeFeedback.length >= limit) {
      throw new Error(
        `Feedback limit reached. This organization allows ${limit} feedback items.`
      );
    }

    const user = await authComponent.safeGetAuthUser(ctx);
    const now = Date.now();

    // Get the default org status (first status by order, usually "Open")
    const orgStatuses = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_org_order", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const defaultOrgStatus = orgStatuses.sort((a, b) => a.order - b.order)[0];

    const feedbackId = await ctx.db.insert("feedback", {
      attachments: args.attachments,
      authorId: user?._id || `anonymous:${args.email || "unknown"}`,
      commentCount: 0,
      createdAt: now,
      description: args.description || "",
      isApproved: !org.feedbackSettings?.requireApproval,
      isPinned: false,
      organizationId: args.organizationId,
      organizationStatusId: defaultOrgStatus?._id,
      status: org.feedbackSettings?.defaultStatus || "open",
      title: args.title,
      updatedAt: now,
      voteCount: 0,
    });

    // Schedule duplicate detection
    await ctx.scheduler.runAfter(
      0,
      internal.duplicates.detection.findSimilarFeedback,
      { feedbackId }
    );

    // Schedule AI auto-triage
    await ctx.scheduler.runAfter(
      0,
      internal.feedback.auto_tagging_actions.processAutoTagging,
      { feedbackId }
    );
    await ctx.scheduler.runAfter(
      0,
      internal.feedback.clarification.generateClarification,
      { feedbackId }
    );
    await ctx.scheduler.runAfter(
      0,
      internal.feedback.draft_reply.generateDraftReplyAction,
      { feedbackId }
    );

    return feedbackId;
  },
});

export const togglePin = mutation({
  args: { id: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.id);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    // Check admin permission
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
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.id);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    if (feedback.deletedAt) {
      throw new Error("Feedback is already deleted");
    }

    // Check permissions
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

    const now = Date.now();
    await ctx.db.patch(args.id, {
      deletedAt: now,
      updatedAt: now,
    });

    return true;
  },
});

export const restore = mutation({
  args: { id: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.id);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    if (!feedback.deletedAt) {
      throw new Error("Feedback is not deleted");
    }

    // Check admin permission
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
