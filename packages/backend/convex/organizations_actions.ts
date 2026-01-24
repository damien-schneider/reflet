import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { MAX_NAME_LENGTH } from "./constants";
import { getAuthUser } from "./utils";

/**
 * Update organization settings (admin/owner only)
 */
export const update = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check admin/owner permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can update organization settings");
    }

    if (args.name.length > MAX_NAME_LENGTH) {
      throw new Error(`Name must be less than ${MAX_NAME_LENGTH} characters`);
    }

    await ctx.db.patch(args.organizationId, {
      name: args.name,
      isPublic: args.isPublic ?? false,
    });

    return args.organizationId;
  },
});

/**
 * Get organization stats (boards count, members count, feedback count)
 */
export const getStats = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!user) {
      return null;
    }

    // Verify membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return null;
    }

    // Count boards
    const boards = await ctx.db
      .query("boards")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Count members
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Count feedback across all boards
    const feedback = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return {
      boardsCount: boards.length,
      membersCount: members.length,
      feedbackCount: feedback.length,
    };
  },
});

/**
 * Delete an organization (owner only)
 */
export const remove = mutation({
  args: { id: v.id("organizations") },
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: deletion workflow is intentionally verbose
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check user is owner
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.id).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role !== "owner") {
      throw new Error("Only the owner can delete an organization");
    }

    // Delete all related data
    // 1. Delete all boards and their feedback
    const boards = await ctx.db
      .query("boards")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.id))
      .collect();

    for (const board of boards) {
      // Delete feedback for this board
      const feedbackItems = await ctx.db
        .query("feedback")
        .withIndex("by_board", (q) => q.eq("boardId", board._id))
        .collect();

      for (const feedback of feedbackItems) {
        // Delete votes
        const votes = await ctx.db
          .query("feedbackVotes")
          .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
          .collect();
        for (const vote of votes) {
          await ctx.db.delete(vote._id);
        }

        // Delete comments
        const comments = await ctx.db
          .query("comments")
          .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
          .collect();
        for (const comment of comments) {
          await ctx.db.delete(comment._id);
        }

        // Delete feedback tags
        const tags = await ctx.db
          .query("feedbackTags")
          .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
          .collect();
        for (const tag of tags) {
          await ctx.db.delete(tag._id);
        }

        await ctx.db.delete(feedback._id);
      }

      await ctx.db.delete(board._id);
    }

    // 2. Delete tags
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.id))
      .collect();
    for (const tag of tags) {
      await ctx.db.delete(tag._id);
    }

    // 3. Delete releases
    const releases = await ctx.db
      .query("releases")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.id))
      .collect();
    for (const release of releases) {
      // Delete release feedback links
      const links = await ctx.db
        .query("releaseFeedback")
        .withIndex("by_release", (q) => q.eq("releaseId", release._id))
        .collect();
      for (const link of links) {
        await ctx.db.delete(link._id);
      }
      await ctx.db.delete(release._id);
    }

    // 4. Delete members
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.id))
      .collect();
    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    // 5. Delete invitations
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.id))
      .collect();
    for (const invitation of invitations) {
      await ctx.db.delete(invitation._id);
    }

    // 6. Delete subscriptions
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.id))
      .collect();
    for (const subscription of subscriptions) {
      await ctx.db.delete(subscription._id);
    }

    // 7. Delete changelog subscribers
    const subscribers = await ctx.db
      .query("changelogSubscribers")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.id))
      .collect();
    for (const subscriber of subscribers) {
      await ctx.db.delete(subscriber._id);
    }

    // 8. Delete activity logs
    const logs = await ctx.db
      .query("activityLogs")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.id))
      .collect();
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }

    // Finally, delete the organization
    await ctx.db.delete(args.id);

    return true;
  },
});
