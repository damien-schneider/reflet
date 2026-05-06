/**
 * Persona mutations — create/update personas owned by PM agent.
 */

import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";

export const createPersona = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.string(),
    role: v.optional(v.string()),
    industry: v.optional(v.string()),
    companySize: v.optional(v.string()),
    painPoints: v.array(v.string()),
    goals: v.array(v.string()),
    alternativesConsidered: v.array(v.string()),
    channels: v.array(v.string()),
    sourceDocIds: v.array(v.id("autopilotDocuments")),
  },
  returns: v.id("autopilotPersonas"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("autopilotPersonas", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});
