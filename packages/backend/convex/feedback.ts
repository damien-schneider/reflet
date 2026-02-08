import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from "./constants";
import { PLAN_LIMITS } from "./organizations";
import { getAuthUser } from "./utils";
import { validateInputLength } from "./validators";

// Feedback status type - matching schema
export const feedbackStatus = v.union(
  v.literal("open"),
  v.literal("under_review"),
  v.literal("planned"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("closed")
);

// ============================================
// QUERIES
// ============================================

/**
 * Get a single feedback item by ID
 */
export const get = query({
  args: { id: v.id("feedback") },
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: query needs to check auth, org access, and build full response
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.id);
    if (!feedback) {
      return null;
    }

    const org = await ctx.db.get(feedback.organizationId);
    if (!org) {
      return null;
    }

    const user = await authComponent.safeGetAuthUser(ctx);

    // Check access
    let isMember = false;
    let role: string | null = null;
    if (user) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
        )
        .unique();
      isMember = !!membership;
      role = membership?.role ?? null;
    }

    // Check visibility: member OR org is public
    if (!(isMember || org.isPublic)) {
      return null;
    }

    // Non-members can't see unapproved feedback
    if (!(isMember || feedback.isApproved)) {
      return null;
    }

    // Get tags
    const feedbackTags = await ctx.db
      .query("feedbackTags")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.id))
      .collect();

    const tags = await Promise.all(
      feedbackTags.map(async (ft) => ctx.db.get(ft.tagId))
    );

    // Check if user voted
    let hasVoted = false;
    let userVoteType: "upvote" | "downvote" | null = null;
    if (user) {
      const vote = await ctx.db
        .query("feedbackVotes")
        .withIndex("by_feedback_user", (q) =>
          q.eq("feedbackId", args.id).eq("userId", user._id)
        )
        .unique();
      hasVoted = !!vote;
      userVoteType = vote?.voteType ?? null;
    }

    // Get organization status if set
    const organizationStatus = feedback.organizationStatusId
      ? await ctx.db.get(feedback.organizationStatusId)
      : null;

    // Get author info from Better Auth
    let author: {
      name?: string;
      email?: string;
      image?: string | null;
    } | null = null;
    if (feedback.authorId) {
      const userData = await authComponent.getAnyUserById(
        ctx,
        feedback.authorId
      );
      if (userData) {
        author = {
          name: userData.name ?? null,
          email: userData.email ?? "",
          image: userData.image ?? null,
        };
      }
    }

    // Get assignee info from Better Auth
    let assignee: {
      id: string;
      name?: string;
      email?: string;
      image?: string | null;
    } | null = null;
    if (feedback.assigneeId) {
      const assigneeData = await authComponent.getAnyUserById(
        ctx,
        feedback.assigneeId
      );
      if (assigneeData) {
        assignee = {
          id: feedback.assigneeId,
          name: assigneeData.name ?? null,
          email: assigneeData.email ?? "",
          image: assigneeData.image ?? null,
        };
      }
    }

    return {
      ...feedback,
      organization: org,
      organizationStatus,
      tags: tags.filter(Boolean),
      hasVoted,
      userVoteType,
      isMember,
      role,
      isAuthor: user?._id === feedback.authorId,
      author,
      assignee,
    };
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Create new feedback
 */
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    tagId: v.optional(v.id("tags")), // Optional tag for categorization
    title: v.string(),
    description: v.string(),
    attachments: v.optional(v.array(v.string())),
  },
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: mutation needs validation, limit checks, and status lookup
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Validate input lengths
    validateInputLength(args.title, MAX_TITLE_LENGTH, "Title");
    validateInputLength(
      args.description,
      MAX_DESCRIPTION_LENGTH,
      "Description"
    );

    let requireApproval = false;
    let defaultStatus:
      | "open"
      | "under_review"
      | "planned"
      | "in_progress"
      | "completed"
      | "closed" = "open";

    // Check tag settings if tag provided
    if (args.tagId) {
      const tag = await ctx.db.get(args.tagId);
      if (tag && tag.organizationId === args.organizationId) {
        requireApproval = tag.settings?.requireApproval ?? false;
        defaultStatus = tag.settings?.defaultStatus ?? "open";
      }
    }

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Fall back to org settings
    if (org.feedbackSettings) {
      requireApproval =
        requireApproval || (org.feedbackSettings.requireApproval ?? false);
      defaultStatus =
        defaultStatus || (org.feedbackSettings.defaultStatus ?? "open");
    }

    // Check access - need to be member OR org is public
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", org._id).eq("userId", user._id)
      )
      .unique();

    const isMember = !!membership;

    // Check org visibility or tag visibility
    let hasAccess = isMember || org.isPublic;
    if (args.tagId && !isMember) {
      const tag = await ctx.db.get(args.tagId);
      hasAccess = hasAccess && (tag?.settings?.isPublic ?? false);
    }
    if (!hasAccess) {
      throw new Error("You don't have access to submit feedback");
    }

    // Check feedback limit (org-level)
    const existingFeedback = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
      .collect();

    const limit = PLAN_LIMITS[org.subscriptionTier].maxFeedbackPerBoard * 10; // Org limit is higher
    if (existingFeedback.length >= limit) {
      throw new Error(
        `Feedback limit reached. This organization allows ${limit} feedback items.`
      );
    }

    // Get the default organization status (first by order)
    const orgStatuses = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_org_order", (q) => q.eq("organizationId", org._id))
      .collect();
    const defaultOrgStatus = orgStatuses.sort((a, b) => a.order - b.order)[0];

    const now = Date.now();
    const feedbackId = await ctx.db.insert("feedback", {
      organizationId: org._id,
      title: args.title,
      description: args.description,
      status: defaultStatus,
      organizationStatusId: defaultOrgStatus?._id,
      authorId: user._id,
      voteCount: 1, // Auto-vote for author
      commentCount: 0,
      isApproved: !requireApproval,
      isPinned: false,
      attachments: args.attachments,
      createdAt: now,
      updatedAt: now,
    });

    // Auto-vote for the author
    await ctx.db.insert("feedbackVotes", {
      feedbackId,
      userId: user._id,
      voteType: "upvote",
      createdAt: now,
    });

    // Add tag if provided
    if (args.tagId) {
      const tag = await ctx.db.get(args.tagId);
      if (tag && tag.organizationId === args.organizationId) {
        await ctx.db.insert("feedbackTags", {
          feedbackId,
          tagId: args.tagId,
        });
      }
    }

    return feedbackId;
  },
});

/**
 * Update feedback (author can update title/description, admin can update all)
 */
export const update = mutation({
  args: {
    id: v.id("feedback"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(feedbackStatus),
    organizationStatusId: v.optional(v.id("organizationStatuses")),
    isApproved: v.optional(v.boolean()),
    isPinned: v.optional(v.boolean()),
    roadmapOrder: v.optional(v.number()),
    attachments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Validate input lengths if present
    if (args.title !== undefined) {
      validateInputLength(args.title, MAX_TITLE_LENGTH, "Title");
    }
    if (args.description !== undefined) {
      validateInputLength(
        args.description,
        MAX_DESCRIPTION_LENGTH,
        "Description"
      );
    }

    const feedback = await ctx.db.get(args.id);
    if (!feedback) {
      throw new Error("Feedback not found");
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
      throw new Error("You don't have permission to update this feedback");
    }

    // Authors can only update title and description
    if (isAdmin) {
      const { id, ...updates } = args;

      // If status changed to completed, set completedAt
      let completedAt = feedback.completedAt;
      if (args.status === "completed" && feedback.status !== "completed") {
        completedAt = Date.now();
      } else if (args.status && args.status !== "completed") {
        completedAt = undefined;
      }

      await ctx.db.patch(id, {
        ...updates,
        completedAt,
        updatedAt: Date.now(),
      });
    } else {
      const { id, title, description } = args;
      if (
        args.status !== undefined ||
        args.organizationStatusId !== undefined ||
        args.isApproved !== undefined ||
        args.isPinned !== undefined ||
        args.roadmapOrder !== undefined
      ) {
        throw new Error("Only admins can update these fields");
      }
      await ctx.db.patch(id, { title, description, updatedAt: Date.now() });
    }

    return args.id;
  },
});
