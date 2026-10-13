import { z } from "zod";

export const INTENTION_FIELDS = [
  "need",
  "observed",
  "response",
  "unknowns",
  "setAside",
] as const;
export type IntentionField = (typeof INTENTION_FIELDS)[number];

export const INTENTION_CHANGE_KINDS = [
  "precision",
  "contradiction",
  "constraint",
  "solution",
  "outcome",
] as const;
export type IntentionChangeKind = (typeof INTENTION_CHANGE_KINDS)[number];

const fieldValueSchema = z.union([z.string(), z.array(z.string())]);

export const intentionChangeSchema = z.object({
  decision: z.enum(["pending", "accepted", "rejected"]),
  evidenceIds: z.array(z.string()),
  field: z.enum(INTENTION_FIELDS),
  hypothesis: z.boolean(),
  id: z.string(),
  kind: z.enum(INTENTION_CHANGE_KINDS),
  operation: z.enum(["replace", "add", "remove"]),
  reason: z.string(),
  segmentIds: z.array(z.string()),
  value: z.string(),
});
export type IntentionChange = z.infer<typeof intentionChangeSchema>;

export const appliedChangeSchema = z.object({
  at: z.number(),
  byName: z.string().nullable(),
  fields: z.array(
    z.object({
      after: fieldValueSchema,
      before: fieldValueSchema,
      field: z.enum(INTENTION_FIELDS),
    })
  ),
  revision: z.number(),
});
export type AppliedChange = z.infer<typeof appliedChangeSchema>;

export const CONTRIBUTION_STATES = [
  "recording",
  "analyzing",
  "ready",
  "no_change",
  "failed",
] as const;
export type ContributionState = (typeof CONTRIBUTION_STATES)[number];

export const sessionContributionSchema = z.object({
  answers: z.array(z.object({ at: z.number(), text: z.string() })),
  applied: z.array(appliedChangeSchema),
  baseRevision: z.number(),
  changes: z.array(intentionChangeSchema),
  detachedAt: z.number().nullable(),
  id: z.string(),
  intentionId: z.string(),
  needsShareConsent: z.boolean(),
  origin: z.enum(["continuation", "attach"]),
  question: z.string().nullable(),
  sharedAt: z.number().nullable(),
  stale: z.boolean(),
  state: z.enum(CONTRIBUTION_STATES),
  verdict: z
    .object({
      reason: z.string(),
      segmentIds: z.array(z.string()),
      status: z.enum(["resolved", "needs_work", "insufficient"]),
    })
    .nullable(),
});
export type SessionContribution = z.infer<typeof sessionContributionSchema>;

export const continuedIntentionSchema = z.object({
  id: z.string(),
  need: z.string(),
  observed: z.string(),
  question: z.string().nullable(),
  response: z.string().nullable(),
  revision: z.number(),
  sessionId: z.string(),
  sessionTitle: z.string(),
  setAside: z.array(z.string()),
  unknowns: z.array(z.string()),
  verification: z
    .object({
      at: z.number(),
      sessionId: z.string().nullable(),
      status: z.enum(["works", "needs_work"]),
    })
    .nullable(),
});
export type ContinuedIntention = z.infer<typeof continuedIntentionSchema>;

export const sessionContinuationSchema = z.object({
  contribution: sessionContributionSchema,
  intention: continuedIntentionSchema.nullable(),
});
export type SessionContinuation = z.infer<typeof sessionContinuationSchema>;

export const contributionQuoteSchema = z.object({
  context: z.array(z.string()),
  segmentId: z.string(),
  startMs: z.number(),
  text: z.string(),
});
export type ContributionQuote = z.infer<typeof contributionQuoteSchema>;

export const intentionHistoryEntrySchema = z.object({
  applied: z.array(appliedChangeSchema),
  detachedAt: z.number().nullable(),
  evidenceIds: z.array(z.string()),
  extractsHidden: z.boolean(),
  id: z.string(),
  intentionId: z.string(),
  origin: z.enum(["continuation", "attach"]),
  quotes: z.array(contributionQuoteSchema),
  session: z.object({
    canOpen: z.boolean(),
    id: z.string(),
    startedAt: z.number(),
    title: z.string(),
  }),
});
export type IntentionHistoryEntry = z.infer<typeof intentionHistoryEntrySchema>;

export const intentionSuggestionSchema = z.object({
  intentionId: z.string(),
  need: z.string(),
  needsShareConsent: z.boolean(),
  reason: z.string(),
  sessionId: z.string(),
  sessionTitle: z.string(),
});
export type IntentionSuggestion = z.infer<typeof intentionSuggestionSchema>;

export const lastHandoffSchema = z.object({
  at: z.number(),
  need: z.string(),
  response: z.string().nullable(),
  revision: z.number(),
  unknowns: z.array(z.string()).nullable(),
});
export type LastHandoff = z.infer<typeof lastHandoffSchema>;
