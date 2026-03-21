import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import {
  MAX_COMMENT_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from "./constants";
import { validateInputLength } from "./validators";

// ============================================
// FEEDBACK STATUS
// ============================================

const feedbackStatus = v.union(
  v.literal("open"),
  v.literal("under_review"),
  v.literal("planned"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("closed")
);

const priorityValue = v.union(
  v.literal("critical"),
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
  v.literal("none")
);

const complexityValue = v.union(
  v.literal("trivial"),
  v.literal("simple"),
  v.literal("moderate"),
  v.literal("complex"),
  v.literal("very_complex")
);

// ============================================
// FEEDBACK ADMIN MUTATIONS
// ============================================

export const updateFeedback = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    feedbackId: v.id("feedback"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.organizationId !== args.organizationId) {
      throw new Error("Feedback not found");
    }

    validateInputLength(args.title, MAX_TITLE_LENGTH, "Title");
    validateInputLength(
      args.description,
      MAX_DESCRIPTION_LENGTH,
      "Description"
    );

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) {
      updates.title = args.title;
    }
    if (args.description !== undefined) {
      updates.description = args.description;
    }

    await ctx.db.patch(args.feedbackId, updates);
    return { success: true };
  },
});

export const deleteFeedback = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    feedbackId: v.id("feedback"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.organizationId !== args.organizationId) {
      throw new Error("Feedback not found");
    }
    await ctx.db.patch(args.feedbackId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const restoreFeedback = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    feedbackId: v.id("feedback"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.organizationId !== args.organizationId) {
      throw new Error("Feedback not found");
    }
    if (!feedback.deletedAt) {
      throw new Error("Feedback is not deleted");
    }
    await ctx.db.patch(args.feedbackId, {
      deletedAt: undefined,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const assignFeedback = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    feedbackId: v.id("feedback"),
    assigneeId: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.organizationId !== args.organizationId) {
      throw new Error("Feedback not found");
    }

    if (args.assigneeId) {
      const member = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("userId", args.assigneeId as string)
        )
        .unique();
      if (!member) {
        throw new Error("Assignee is not a member of this organization");
      }
    }

    await ctx.db.patch(args.feedbackId, {
      assigneeId: args.assigneeId,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const setFeedbackStatus = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    feedbackId: v.id("feedback"),
    statusId: v.optional(v.id("organizationStatuses")),
    status: v.optional(feedbackStatus),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.organizationId !== args.organizationId) {
      throw new Error("Feedback not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.statusId !== undefined) {
      if (args.statusId) {
        const orgStatus = await ctx.db.get(args.statusId);
        if (!orgStatus || orgStatus.organizationId !== args.organizationId) {
          throw new Error("Status not found in this organization");
        }
      }
      updates.organizationStatusId = args.statusId;
    }

    if (args.status !== undefined) {
      updates.status = args.status;
      if (args.status === "completed") {
        updates.completedAt = Date.now();
      }
    }

    await ctx.db.patch(args.feedbackId, updates);
    return { success: true };
  },
});

export const updateFeedbackTags = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    feedbackId: v.id("feedback"),
    addTagIds: v.optional(v.array(v.id("tags"))),
    removeTagIds: v.optional(v.array(v.id("tags"))),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.organizationId !== args.organizationId) {
      throw new Error("Feedback not found");
    }

    // Add tags
    if (args.addTagIds) {
      for (const tagId of args.addTagIds) {
        const tag = await ctx.db.get(tagId);
        if (!tag || tag.organizationId !== args.organizationId) {
          throw new Error(`Tag ${tagId} not found`);
        }
        const existing = await ctx.db
          .query("feedbackTags")
          .withIndex("by_feedback_tag", (q) =>
            q.eq("feedbackId", args.feedbackId).eq("tagId", tagId)
          )
          .unique();
        if (!existing) {
          await ctx.db.insert("feedbackTags", {
            feedbackId: args.feedbackId,
            tagId,
          });
        }
      }
    }

    // Remove tags
    if (args.removeTagIds) {
      for (const tagId of args.removeTagIds) {
        const existing = await ctx.db
          .query("feedbackTags")
          .withIndex("by_feedback_tag", (q) =>
            q.eq("feedbackId", args.feedbackId).eq("tagId", tagId)
          )
          .unique();
        if (existing) {
          await ctx.db.delete(existing._id);
        }
      }
    }

    return { success: true };
  },
});

export const updateFeedbackAnalysis = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    feedbackId: v.id("feedback"),
    priority: v.optional(priorityValue),
    complexity: v.optional(complexityValue),
    timeEstimate: v.optional(v.string()),
    deadline: v.optional(v.number()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.organizationId !== args.organizationId) {
      throw new Error("Feedback not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.priority !== undefined) {
      updates.priority = args.priority;
    }
    if (args.complexity !== undefined) {
      updates.complexity = args.complexity;
    }
    if (args.timeEstimate !== undefined) {
      updates.timeEstimate = args.timeEstimate;
    }
    if (args.deadline !== undefined) {
      updates.deadline = args.deadline;
    }

    await ctx.db.patch(args.feedbackId, updates);
    return { success: true };
  },
});

// ============================================
// COMMENT ADMIN MUTATIONS
// ============================================

export const updateComment = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    commentId: v.id("comments"),
    body: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    validateInputLength(args.body, MAX_COMMENT_LENGTH, "Comment body");

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    const feedback = await ctx.db.get(comment.feedbackId);
    if (!feedback || feedback.organizationId !== args.organizationId) {
      throw new Error("Comment not found in this organization");
    }

    await ctx.db.patch(args.commentId, {
      body: args.body,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const deleteComment = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    commentId: v.id("comments"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    const feedback = await ctx.db.get(comment.feedbackId);
    if (!feedback || feedback.organizationId !== args.organizationId) {
      throw new Error("Comment not found in this organization");
    }

    // Delete replies first
    const replies = await ctx.db
      .query("comments")
      .withIndex("by_parent", (q) => q.eq("parentId", args.commentId))
      .collect();
    for (const reply of replies) {
      await ctx.db.delete(reply._id);
    }

    await ctx.db.delete(args.commentId);

    // Update comment count
    await ctx.db.patch(comment.feedbackId, {
      commentCount: Math.max(0, feedback.commentCount - 1 - replies.length),
    });

    return { success: true };
  },
});

export const markCommentOfficial = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    commentId: v.id("comments"),
    isOfficial: v.boolean(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    const feedback = await ctx.db.get(comment.feedbackId);
    if (!feedback || feedback.organizationId !== args.organizationId) {
      throw new Error("Comment not found in this organization");
    }

    await ctx.db.patch(args.commentId, {
      isOfficial: args.isOfficial,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
