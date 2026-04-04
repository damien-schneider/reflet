import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import {
  autopilotTaskPriority,
  initiativeCreatedBy,
  initiativeStatus,
} from "./schema/validators";

const DEFAULT_MAX_ACTIVE_INITIATIVES = 3;

export const createInitiative = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.string(),
    priority: autopilotTaskPriority,
    successMetrics: v.optional(v.string()),
    targetDate: v.optional(v.number()),
    createdBy: initiativeCreatedBy,
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    const maxActive =
      config?.maxActiveInitiatives ?? DEFAULT_MAX_ACTIVE_INITIATIVES;

    const activeInitiatives = await ctx.db
      .query("autopilotInitiatives")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    if (activeInitiatives.length >= maxActive) {
      return null;
    }

    return ctx.db.insert("autopilotInitiatives", {
      organizationId: args.organizationId,
      title: args.title,
      description: args.description,
      status: "discovery",
      priority: args.priority,
      successMetrics: args.successMetrics,
      completionPercent: 0,
      targetDate: args.targetDate,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateInitiativeStatus = internalMutation({
  args: {
    initiativeId: v.id("autopilotInitiatives"),
    status: initiativeStatus,
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const initiative = await ctx.db.get(args.initiativeId);

    if (!initiative) {
      throw new Error("Initiative not found");
    }

    await ctx.db.patch(args.initiativeId, {
      status: args.status,
      updatedAt: now,
    });

    const stories = await ctx.db
      .query("autopilotUserStories")
      .withIndex("by_initiative", (q) =>
        q.eq("initiativeId", args.initiativeId)
      )
      .collect();

    if (stories.length > 0) {
      const shippedCount = stories.filter((s) => s.status === "shipped").length;
      const completionPercent = Math.round(
        (shippedCount / stories.length) * 100
      );
      await ctx.db.patch(args.initiativeId, { completionPercent });
    }
  },
});

export const getInitiative = internalQuery({
  args: { initiativeId: v.id("autopilotInitiatives") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.initiativeId);
  },
});

export const getInitiativesByOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(initiativeStatus),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      const status = args.status;
      return await ctx.db
        .query("autopilotInitiatives")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
        )
        .collect();
    }

    return await ctx.db
      .query("autopilotInitiatives")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
  },
});

export const recalculateCompletion = internalMutation({
  args: { initiativeId: v.id("autopilotInitiatives") },
  handler: async (ctx, args) => {
    const stories = await ctx.db
      .query("autopilotUserStories")
      .withIndex("by_initiative", (q) =>
        q.eq("initiativeId", args.initiativeId)
      )
      .collect();

    if (stories.length === 0) {
      await ctx.db.patch(args.initiativeId, {
        completionPercent: 0,
        updatedAt: Date.now(),
      });
      return;
    }

    const shippedCount = stories.filter((s) => s.status === "shipped").length;
    const completionPercent = Math.round((shippedCount / stories.length) * 100);

    await ctx.db.patch(args.initiativeId, {
      completionPercent,
      updatedAt: Date.now(),
    });
  },
});
