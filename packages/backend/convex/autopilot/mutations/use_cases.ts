/**
 * Use case mutations — create use cases owned by PM agent.
 * Validation scores are written by the Validator agent, not here.
 */

import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";

export const createUseCase = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.string(),
    personaIds: v.array(v.id("autopilotPersonas")),
    triggerScenario: v.optional(v.string()),
    expectedOutcome: v.optional(v.string()),
    sourceDocIds: v.array(v.id("autopilotDocuments")),
  },
  returns: v.id("autopilotUseCases"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("autopilotUseCases", {
      ...args,
      status: "pending_review",
      createdAt: now,
      updatedAt: now,
    });
  },
});
