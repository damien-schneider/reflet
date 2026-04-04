import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { autopilotTaskPriority, userStoryStatus } from "./schema/validators";

const DEFAULT_MAX_STORIES_PER_INITIATIVE = 20;

export const createUserStory = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    initiativeId: v.id("autopilotInitiatives"),
    title: v.string(),
    description: v.string(),
    acceptanceCriteria: v.array(v.string()),
    priority: autopilotTaskPriority,
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const initiative = await ctx.db.get(args.initiativeId);
    if (!initiative) {
      throw new Error("Initiative not found");
    }

    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    const maxStories =
      config?.maxActiveStoriesPerInitiative ??
      DEFAULT_MAX_STORIES_PER_INITIATIVE;

    const existingStories = await ctx.db
      .query("autopilotUserStories")
      .withIndex("by_initiative", (q) =>
        q.eq("initiativeId", args.initiativeId)
      )
      .collect();

    if (existingStories.length >= maxStories) {
      return null;
    }

    return ctx.db.insert("autopilotUserStories", {
      organizationId: args.organizationId,
      initiativeId: args.initiativeId,
      title: args.title,
      description: args.description,
      acceptanceCriteria: args.acceptanceCriteria,
      status: "draft",
      priority: args.priority,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateStoryStatus = internalMutation({
  args: {
    storyId: v.id("autopilotUserStories"),
    status: userStoryStatus,
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const story = await ctx.db.get(args.storyId);

    if (!story) {
      throw new Error("User story not found");
    }

    await ctx.db.patch(args.storyId, {
      status: args.status,
      updatedAt: now,
    });

    const stories = await ctx.db
      .query("autopilotUserStories")
      .withIndex("by_initiative", (q) =>
        q.eq("initiativeId", story.initiativeId)
      )
      .collect();

    if (stories.length > 0) {
      const shippedCount = stories.filter((s) => {
        if (s._id === args.storyId) {
          return args.status === "shipped";
        }
        return s.status === "shipped";
      }).length;

      const completionPercent = Math.round(
        (shippedCount / stories.length) * 100
      );

      await ctx.db.patch(story.initiativeId, {
        completionPercent,
        updatedAt: now,
      });
    }
  },
});

export const getStoriesByInitiative = internalQuery({
  args: { initiativeId: v.id("autopilotInitiatives") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("autopilotUserStories")
      .withIndex("by_initiative", (q) =>
        q.eq("initiativeId", args.initiativeId)
      )
      .collect();
  },
});
