/**
 * Agent Memory — persistent per-agent memory that survives across runs.
 *
 * Prevents redundant work (re-researching topics, re-contacting leads)
 * and enables learning from past outcomes.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { assignedAgent, memoryCategory } from "./schema/validators";

const MAX_MEMORIES_PER_AGENT = 200;
const DEFAULT_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ============================================
// QUERIES
// ============================================

export const getAgentMemories = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    agent: assignedAgent,
    category: v.optional(memoryCategory),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("autopilotAgentMemories"),
      category: memoryCategory,
      key: v.string(),
      value: v.string(),
      outcome: v.optional(
        v.union(
          v.literal("success"),
          v.literal("failure"),
          v.literal("neutral")
        )
      ),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit = args.limit ?? 50;

    const allMemories = await ctx.db
      .query("autopilotAgentMemories")
      .withIndex("by_org_agent", (q) =>
        q.eq("organizationId", args.organizationId).eq("agent", args.agent)
      )
      .order("desc")
      .take(limit * 2);

    const filtered = args.category
      ? allMemories.filter((m) => m.category === args.category)
      : allMemories;

    return filtered
      .filter((m) => !m.expiresAt || m.expiresAt > now)
      .slice(0, limit)
      .map((m) => ({
        _id: m._id,
        category: m.category,
        key: m.key,
        value: m.value,
        outcome: m.outcome,
        createdAt: m.createdAt,
      }));
  },
});

export const hasMemory = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    agent: assignedAgent,
    key: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("autopilotAgentMemories")
      .withIndex("by_org_agent_key", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("agent", args.agent)
          .eq("key", args.key)
      )
      .first();

    if (!existing) {
      return false;
    }

    if (existing.expiresAt && existing.expiresAt < Date.now()) {
      return false;
    }

    return true;
  },
});

// ============================================
// MUTATIONS
// ============================================

export const recordMemory = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    agent: assignedAgent,
    category: memoryCategory,
    key: v.string(),
    value: v.string(),
    outcome: v.optional(
      v.union(v.literal("success"), v.literal("failure"), v.literal("neutral"))
    ),
    expiresAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("autopilotAgentMemories")
      .withIndex("by_org_agent_key", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("agent", args.agent)
          .eq("key", args.key)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        outcome: args.outcome,
        expiresAt: args.expiresAt ?? Date.now() + DEFAULT_EXPIRY_MS,
      });
      return null;
    }

    // Enforce per-agent memory cap — evict oldest if full
    const count = await ctx.db
      .query("autopilotAgentMemories")
      .withIndex("by_org_agent", (q) =>
        q.eq("organizationId", args.organizationId).eq("agent", args.agent)
      )
      .collect();

    if (count.length >= MAX_MEMORIES_PER_AGENT) {
      const oldest = count[0];
      if (oldest) {
        await ctx.db.delete(oldest._id);
      }
    }

    await ctx.db.insert("autopilotAgentMemories", {
      organizationId: args.organizationId,
      agent: args.agent,
      category: args.category,
      key: args.key,
      value: args.value,
      outcome: args.outcome,
      createdAt: Date.now(),
      expiresAt: args.expiresAt ?? Date.now() + DEFAULT_EXPIRY_MS,
    });

    return null;
  },
});

export const deleteExpiredMemories = internalMutation({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("autopilotAgentMemories")
      .withIndex("by_org_agent", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .take(100);

    for (const memory of expired) {
      await ctx.db.delete(memory._id);
    }

    return expired.length;
  },
});
