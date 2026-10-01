import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";
import { archiveFeedback } from "../feedback/archive_feedback";
import {
  changePublication,
  publicationStateValidator,
} from "../feedback/publication";
import { changeFeedbackStatus } from "../feedback/status_change";
import { confirmTag, refuseTag } from "../feedback/tag_decisions";
import {
  MAX_COMMENT_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from "../shared/constants";
import { validateInputLength } from "../shared/validators";

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
    description: v.optional(v.string()),
    feedbackId: v.id("feedback"),
    organizationId: v.id("organizations"),
    title: v.optional(v.string()),
  },
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

    const updates: Partial<Doc<"feedback">> = { updatedAt: Date.now() };
    if (args.title !== undefined) {
      updates.title = args.title;
    }
    if (args.description !== undefined) {
      updates.description = args.description;
    }

    await ctx.db.patch(args.feedbackId, updates);
    return { success: true };
  },
  returns: v.object({ success: v.boolean() }),
});

export const deleteFeedback = internalMutation({
  args: {
    feedbackId: v.id("feedback"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.organizationId !== args.organizationId) {
      throw new Error("Feedback not found");
    }
    await archiveFeedback(ctx, feedback._id);
    return { success: true };
  },
  returns: v.object({ success: v.boolean() }),
});

export const restoreFeedback = internalMutation({
  args: {
    feedbackId: v.id("feedback"),
    organizationId: v.id("organizations"),
  },
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
  returns: v.object({ success: v.boolean() }),
});

export const assignFeedback = internalMutation({
  args: {
    assigneeId: v.optional(v.string()),
    feedbackId: v.id("feedback"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.organizationId !== args.organizationId) {
      throw new Error("Feedback not found");
    }

    if (args.assigneeId) {
      const assigneeId = args.assigneeId;
      const member = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q.eq("organizationId", args.organizationId).eq("userId", assigneeId)
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
  returns: v.object({ success: v.boolean() }),
});

export const setFeedbackStatus = internalMutation({
  args: {
    feedbackId: v.id("feedback"),
    organizationId: v.id("organizations"),
    status: v.optional(feedbackStatus),
    statusId: v.optional(v.id("organizationStatuses")),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.organizationId !== args.organizationId) {
      throw new Error("Feedback not found");
    }

    await changeFeedbackStatus(ctx, feedback, {
      actorId: "api",
      organizationStatusId: args.statusId,
      source: "api",
      status: args.status,
    });
    return { success: true };
  },
  returns: v.object({ success: v.boolean() }),
});

export const setFeedbackPublication = internalMutation({
  args: {
    feedbackId: v.id("feedback"),
    organizationId: v.id("organizations"),
    state: publicationStateValidator,
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (
      !feedback ||
      feedback.organizationId !== args.organizationId ||
      feedback.deletedAt
    ) {
      throw new Error("Feedback not found");
    }
    await changePublication(ctx, feedback, {
      actorId: "api",
      state: args.state,
    });
    return { success: true };
  },
  returns: v.object({ success: v.boolean() }),
});

export const updateFeedbackTags = internalMutation({
  args: {
    addTagIds: v.optional(v.array(v.id("tags"))),
    feedbackId: v.id("feedback"),
    organizationId: v.id("organizations"),
    removeTagIds: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.organizationId !== args.organizationId) {
      throw new Error("Feedback not found");
    }

    for (const tagId of args.addTagIds ?? []) {
      const current = await ctx.db.get(feedback._id);
      if (current) {
        await confirmTag(ctx, current, tagId);
      }
    }
    for (const tagId of args.removeTagIds ?? []) {
      const current = await ctx.db.get(feedback._id);
      if (current) {
        await refuseTag(ctx, current, tagId);
      }
    }

    return { success: true };
  },
  returns: v.object({ success: v.boolean() }),
});

export const updateFeedbackAnalysis = internalMutation({
  args: {
    complexity: v.optional(complexityValue),
    deadline: v.optional(v.number()),
    feedbackId: v.id("feedback"),
    organizationId: v.id("organizations"),
    priority: v.optional(priorityValue),
    timeEstimate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.organizationId !== args.organizationId) {
      throw new Error("Feedback not found");
    }

    const updates: Partial<Doc<"feedback">> = { updatedAt: Date.now() };
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
  returns: v.object({ success: v.boolean() }),
});

// ============================================
// COMMENT ADMIN MUTATIONS
// ============================================

export const updateComment = internalMutation({
  args: {
    body: v.string(),
    commentId: v.id("comments"),
    organizationId: v.id("organizations"),
  },
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
  returns: v.object({ success: v.boolean() }),
});

export const deleteComment = internalMutation({
  args: {
    commentId: v.id("comments"),
    organizationId: v.id("organizations"),
  },
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
  returns: v.object({ success: v.boolean() }),
});

export const markCommentOfficial = internalMutation({
  args: {
    commentId: v.id("comments"),
    isOfficial: v.boolean(),
    organizationId: v.id("organizations"),
  },
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
  returns: v.object({ success: v.boolean() }),
});
