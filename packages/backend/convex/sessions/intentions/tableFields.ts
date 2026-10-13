import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  intentionChangeValidator,
  intentionFieldValidator,
  intentionFieldValueValidator,
  verdictStatusValidator,
} from "../validators";

export const appliedChangeValidator = v.object({
  at: v.number(),
  by: v.string(),
  changeIds: v.array(v.string()),
  fields: v.array(
    v.object({
      after: intentionFieldValueValidator,
      before: intentionFieldValueValidator,
      field: intentionFieldValidator,
    })
  ),
  revision: v.number(),
});

export const intentionTables = {
  sessionContributions: defineTable({
    answers: v.array(v.object({ at: v.number(), text: v.string() })),
    applied: v.array(appliedChangeValidator),
    attachedProposalId: v.optional(v.id("sessionProposals")),
    baseRevision: v.number(),
    changes: v.array(intentionChangeValidator),
    createdAt: v.number(),
    detachedAt: v.optional(v.number()),
    evidenceIds: v.array(v.id("sessionEvidence")),
    intentionId: v.id("sessionProposals"),
    organizationId: v.id("organizations"),
    origin: v.union(v.literal("continuation"), v.literal("attach")),
    question: v.optional(v.string()),
    segmentIds: v.array(v.id("sessionSegments")),
    sessionId: v.id("sessions"),
    sharedAt: v.optional(v.number()),
    updatedAt: v.number(),
    verdict: v.optional(
      v.object({
        reason: v.string(),
        segmentIds: v.array(v.id("sessionSegments")),
        status: verdictStatusValidator,
      })
    ),
  })
    .index("by_intention", ["intentionId"])
    .index("by_session", ["sessionId"])
    .index("by_attached_proposal", ["attachedProposalId"]),
};
