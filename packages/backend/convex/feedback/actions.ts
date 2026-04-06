import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { PLAN_LIMITS } from "../organizations/queries";
import { getAuthUser } from "../shared/utils";

/**
 * List public feedback for an organization (no auth required)
 */
export const listPublic = query({
  args: {
    organizationId: v.id("organizations"),
    sortBy: v.optional(
      v.union(
        v.literal("votes"),
        v.literal("newest"),
        v.literal("oldest"),
        v.literal("comments")
      )
    ),
    limit: v.optional(v.number()),
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
          tags: tags.filter(Boolean),
          hasVoted,
        };
      })
    );

    return feedbackWithDetails;
  },
});

/**
 * Create public feedback at organization level (for public orgs)
 */
export const createPublicOrg = mutation({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.optional(v.string()),
    email: v.optional(v.string()),
    attachments: v.optional(v.array(v.string())),
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
      organizationId: args.organizationId,
      title: args.title,
      description: args.description || "",
      status: org.feedbackSettings?.defaultStatus || "open",
      organizationStatusId: defaultOrgStatus?._id,
      authorId: user?._id || `anonymous:${args.email || "unknown"}`,
      voteCount: 0,
      commentCount: 0,
      isApproved: !org.feedbackSettings?.requireApproval,
      isPinned: false,
      attachments: args.attachments,
      createdAt: now,
      updatedAt: now,
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
      internal.feedback.clarification_draft_reply.generateDraftReplyAction,
      { feedbackId }
    );

    return feedbackId;
  },
});

/**
 * Toggle pin status on feedback
 */
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

/**
 * Add a tag to feedback
 */
export const addTag = mutation({
  args: {
    feedbackId: v.id("feedback"),
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    const tag = await ctx.db.get(args.tagId);
    if (!tag || tag.organizationId !== feedback.organizationId) {
      throw new Error("Tag not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can manage tags");
    }

    // Check if already tagged
    const existing = await ctx.db
      .query("feedbackTags")
      .withIndex("by_feedback_tag", (q) =>
        q.eq("feedbackId", args.feedbackId).eq("tagId", args.tagId)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    const linkId = await ctx.db.insert("feedbackTags", {
      feedbackId: args.feedbackId,
      tagId: args.tagId,
    });

    return linkId;
  },
});

/**
 * Remove a tag from feedback
 */
export const removeTag = mutation({
  args: {
    feedbackId: v.id("feedback"),
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
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
      throw new Error("Only admins can manage tags");
    }

    const link = await ctx.db
      .query("feedbackTags")
      .withIndex("by_feedback_tag", (q) =>
        q.eq("feedbackId", args.feedbackId).eq("tagId", args.tagId)
      )
      .unique();

    if (link) {
      await ctx.db.delete(link._id);
    }

    return true;
  },
});
