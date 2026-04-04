/**
 * Notes — shared board for inter-agent communication.
 *
 * Each agent writes notes in its own domain (category). Notes replace
 * the old "signals" system with domain-restricted writes.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import {
  autopilotTaskPriority,
  noteCategory,
  noteStatus,
  noteType,
} from "./schema/validators";

const DEDUP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const TITLE_SIMILARITY_THRESHOLD = 0.8;
const DISMISSED_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const UNACTED_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_EXPIRES_MS = 30 * 24 * 60 * 60 * 1000;

const WHITESPACE_REGEX = /\s+/;

/**
 * Maps each agent to its allowed note category (domain restriction).
 */
export const AGENT_CATEGORY_MAP: Record<string, string> = {
  pm: "product",
  cto: "engineering",
  dev: "engineering",
  growth: "market",
  sales: "prospect",
  security: "security",
  architect: "architecture",
  support: "support",
  docs: "documentation",
  ceo: "coordination",
  system: "coordination",
} as const;

/**
 * Validate that an agent is writing to its allowed domain.
 * Returns true if the agent/category pair is valid.
 */
export const validateNoteDomain = (
  agent: string,
  category: string
): boolean => {
  const allowedCategory = AGENT_CATEGORY_MAP[agent];
  return allowedCategory === category;
};

const computeTitleSimilarity = (a: string, b: string): number => {
  const wordsA = new Set(a.toLowerCase().split(WHITESPACE_REGEX));
  const wordsB = new Set(b.toLowerCase().split(WHITESPACE_REGEX));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
};

export const createNote = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    type: noteType,
    category: noteCategory,
    title: v.string(),
    description: v.string(),
    sourceAgent: v.string(),
    targetAgent: v.optional(v.string()),
    priority: autopilotTaskPriority,
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!validateNoteDomain(args.sourceAgent, args.category)) {
      throw new Error(
        `Agent "${args.sourceAgent}" cannot write to category "${args.category}"`
      );
    }

    const now = Date.now();
    const windowStart = now - DEDUP_WINDOW_MS;

    const recentNotes = await ctx.db
      .query("autopilotNotes")
      .withIndex("by_org_category", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("category", args.category)
      )
      .collect();

    const recentOfCategory = recentNotes.filter(
      (n) => n.createdAt > windowStart
    );

    for (const existing of recentOfCategory) {
      const similarity = computeTitleSimilarity(args.title, existing.title);
      if (similarity >= TITLE_SIMILARITY_THRESHOLD) {
        await ctx.db.patch(existing._id, {
          strength: existing.strength + 1,
          description: `${existing.description}\n\n---\nMerged note: ${args.description}`,
        });
        return existing._id;
      }
    }

    return ctx.db.insert("autopilotNotes", {
      organizationId: args.organizationId,
      type: args.type,
      category: args.category,
      title: args.title,
      description: args.description,
      sourceAgent: args.sourceAgent,
      targetAgent: args.targetAgent,
      strength: 1,
      priority: args.priority,
      status: "new",
      sourceUrl: args.sourceUrl,
      createdAt: now,
      expiresAt: now + DEFAULT_EXPIRES_MS,
    });
  },
});

export const triageNote = internalMutation({
  args: {
    noteId: v.id("autopilotNotes"),
    status: v.union(v.literal("triaged"), v.literal("dismissed")),
    linkedInitiativeId: v.optional(v.id("autopilotInitiatives")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.noteId, {
      status: args.status,
      triagedAt: now,
      linkedInitiativeId: args.linkedInitiativeId,
    });
  },
});

export const dismissNote = internalMutation({
  args: { noteId: v.id("autopilotNotes") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.noteId, {
      status: "dismissed",
      triagedAt: Date.now(),
    });
  },
});

export const getNotesForTriage = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("autopilotNotes")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "new")
      )
      .collect();

    const priorityOrder = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    } as const;

    return notes.sort((a, b) => {
      const priorityDiff =
        priorityOrder[a.priority as keyof typeof priorityOrder] -
        priorityOrder[b.priority as keyof typeof priorityOrder];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return b.strength - a.strength;
    });
  },
});

export const getRecentNotes = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    windowMs: v.optional(v.number()),
    category: v.optional(noteCategory),
  },
  handler: async (ctx, args) => {
    const windowMs = args.windowMs ?? 48 * 60 * 60 * 1000;
    const since = Date.now() - windowMs;

    if (args.category) {
      const { category } = args;
      const notes = await ctx.db
        .query("autopilotNotes")
        .withIndex("by_org_category", (q) =>
          q.eq("organizationId", args.organizationId).eq("category", category)
        )
        .collect();
      return notes.filter((n) => n.createdAt > since);
    }

    const notes = await ctx.db
      .query("autopilotNotes")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return notes.filter((n) => n.createdAt > since);
  },
});

export const cleanupNotes = internalMutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const notes = await ctx.db
      .query("autopilotNotes")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    let deletedCount = 0;

    for (const note of notes) {
      const isDismissedExpired =
        note.status === "dismissed" &&
        note.triagedAt &&
        now - note.triagedAt > DISMISSED_EXPIRY_MS;

      const isUnactedExpired =
        note.status === "new" && now - note.createdAt > UNACTED_EXPIRY_MS;

      const isPastExpiry = now > note.expiresAt;

      if (isDismissedExpired || isUnactedExpired || isPastExpiry) {
        await ctx.db.delete(note._id);
        deletedCount++;
      }
    }

    return deletedCount;
  },
});

export const getNotesByCategory = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    category: noteCategory,
    status: v.optional(noteStatus),
  },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("autopilotNotes")
      .withIndex("by_org_category", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("category", args.category)
      )
      .collect();

    if (args.status) {
      return notes.filter((n) => n.status === args.status);
    }
    return notes;
  },
});
