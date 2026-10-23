import { z } from "zod";
import { sessionAnalysisModel } from "../../../ai/openrouter";
import { generateStructured } from "../../../ai/structured_output";
import { SESSION_TEXT_LIMITS } from "../../constants";
import { isOperationAllowed } from "../../intentions/changes";
import {
  cleanText,
  type GenerationMaterial,
  MAX_OUTPUT_TOKENS,
  mergeSuggestionsSchema,
  proposalOutputSchema,
  type ResolvedProposal,
  readingRules,
  resolveAliases,
  resolveProposals,
  type ShownIds,
  systemPromptsFor,
  WRITING_RULES,
} from "../analysis_model";

const MAX_CHANGES = 8;

const INTENTION_FIELDS = [
  "need",
  "observed",
  "response",
  "unknowns",
  "setAside",
] as const;

const FIELD_LIMITS: Record<(typeof INTENTION_FIELDS)[number], number> = {
  need: SESSION_TEXT_LIMITS.need,
  observed: SESSION_TEXT_LIMITS.observed,
  response: SESSION_TEXT_LIMITS.response,
  setAside: SESSION_TEXT_LIMITS.listItem,
  unknowns: SESSION_TEXT_LIMITS.listItem,
};

const continuationRules = (
  speakersLabelled: boolean
): string => `You compare a new recorded walkthrough of a web app with an intention its author confirmed in an earlier session, and propose precise changes to that intention for the author to accept or reject.

${readingRules(speakersLabelled)}

How to update the intention:
1. The intention is what the author already confirmed. Never rewrite it wholesale: propose one change per distinct thing the new session adds. Zero changes is the right answer when the new session adds nothing to it.
2. kind: "precision" when the author makes the need, the situation or the unknowns more precise; "contradiction" when the new session contradicts something in the intention; "constraint" when the result must respect a new condition; "solution" when the author proposes or refines a way to get there (it goes in response); "outcome" when the author checked the result.
3. field and operation: need, observed and response take "replace" with the complete new text. unknowns and setAside take "add" or "remove" with exactly one item, written as it appears in the intention when removing.
4. Change need only when the author clearly redefined the result they want. A solution is never a need.
5. hypothesis: true when you inferred the change instead of hearing the author say it.
6. reason: one short sentence that says what the author said or did in the new session.
7. segments and evidence: the aliases (S1…, E1…) of this session that support the change. Every change needs at least one passage, unless it comes from the author's answer to your question.
8. question: ONE short question to the author when something important about this intention is still unclear; otherwise null. The author's answers to your earlier questions outrank your reading of the transcript.
9. verdict: when the author checked whether the intention is resolved in the running app, "resolved", "needs_work", or "insufficient" when they looked but the session does not show enough, with a short reason and the passages; otherwise null.
10. Write values, reasons and the question in the language the author speaks in the transcript.

Other needs in this session:
- proposals: only needs that are NOT the intention being continued, following the rules below. Never put a change to the intention in proposals.
- sameNeedAsIntention: a short reason when a proposal might in fact be the intention being continued, otherwise null.
- mergeSuggestions: only when two of your proposals might be the same need; usually empty.

${WRITING_RULES}`;

const changeOutputSchema = z.object({
  evidence: z.array(z.string()),
  field: z.enum(INTENTION_FIELDS),
  hypothesis: z.boolean(),
  kind: z.enum([
    "precision",
    "contradiction",
    "constraint",
    "solution",
    "outcome",
  ]),
  operation: z.enum(["replace", "add", "remove"]),
  reason: z.string(),
  segments: z.array(z.string()),
  value: z.string(),
});

const continuationOutputSchema = z.object({
  mergeSuggestions: mergeSuggestionsSchema,
  proposals: z.array(
    proposalOutputSchema.extend({ sameNeedAsIntention: z.string().nullable() })
  ),
  update: z.object({
    changes: z.array(changeOutputSchema),
    question: z.string().nullable(),
    verdict: z
      .object({
        reason: z.string(),
        segments: z.array(z.string()),
        status: z.enum(["resolved", "needs_work", "insufficient"]),
      })
      .nullable(),
  }),
});

export type ContinuationOutput = z.infer<typeof continuationOutputSchema>;
type ChangeOutput = z.infer<typeof changeOutputSchema>;

const continuationSystemPrompt = systemPromptsFor(
  continuationRules,
  continuationOutputSchema
);

export const generateContinuationAnalysis = (
  material: GenerationMaterial
): Promise<ContinuationOutput> =>
  generateStructured({
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    model: sessionAnalysisModel,
    prompt: material.prompt,
    schema: continuationOutputSchema,
    system: continuationSystemPrompt(material.speakersLabelled),
  });

export interface ResolvedChange<
  SegmentId extends string,
  EvidenceId extends string,
> {
  evidenceIds: EvidenceId[];
  field: ChangeOutput["field"];
  hypothesis: boolean;
  kind: ChangeOutput["kind"];
  operation: ChangeOutput["operation"];
  reason: string;
  segmentIds: SegmentId[];
  value: string;
}

export interface ResolvedContinuation<
  SegmentId extends string,
  EvidenceId extends string,
> {
  mergeGroups: { indexes: number[]; reason: string }[];
  proposals: ResolvedProposal<SegmentId, EvidenceId>[];
  suggestions: { index: number; reason: string }[];
  update: {
    changes: ResolvedChange<SegmentId, EvidenceId>[];
    question: string | null;
    verdict: {
      reason: string;
      segmentIds: SegmentId[];
      status: "resolved" | "needs_work" | "insufficient";
    } | null;
  };
}

const resolveChange = <SegmentId extends string, EvidenceId extends string>(
  change: ChangeOutput,
  context: { answered: boolean; shown: ShownIds<SegmentId, EvidenceId> }
): ResolvedChange<SegmentId, EvidenceId> | null => {
  const value = cleanText(change.value, FIELD_LIMITS[change.field]);
  const reason = cleanText(change.reason, SESSION_TEXT_LIMITS.listItem);
  const segmentIds = resolveAliases(
    change.segments,
    context.shown.segmentIds,
    "S"
  );
  const supported = segmentIds.length > 0 || context.answered;
  const valid =
    value !== null &&
    reason !== null &&
    supported &&
    isOperationAllowed(change.field, change.operation);
  if (!valid) {
    return null;
  }
  return {
    evidenceIds: resolveAliases(
      change.evidence,
      context.shown.evidenceIds,
      "E"
    ),
    field: change.field,
    hypothesis: change.hypothesis,
    kind: change.kind,
    operation: change.operation,
    reason,
    segmentIds,
    value,
  };
};

export const resolveContinuation = <
  SegmentId extends string,
  EvidenceId extends string,
>(
  output: ContinuationOutput,
  context: { answered: boolean; shown: ShownIds<SegmentId, EvidenceId> }
): ResolvedContinuation<SegmentId, EvidenceId> => {
  const { keptOutputIndexes, mergeGroups, proposals } = resolveProposals(
    output,
    context.shown
  );
  const suggestions = keptOutputIndexes.flatMap((outputIndex, index) => {
    const reason = cleanText(
      output.proposals[outputIndex]?.sameNeedAsIntention ?? null,
      SESSION_TEXT_LIMITS.listItem
    );
    return reason ? [{ index, reason }] : [];
  });
  const { verdict } = output.update;
  const verdictReason = verdict
    ? cleanText(verdict.reason, SESSION_TEXT_LIMITS.listItem)
    : null;
  return {
    mergeGroups,
    proposals,
    suggestions,
    update: {
      changes: output.update.changes
        .flatMap((change) => resolveChange(change, context) ?? [])
        .slice(0, MAX_CHANGES),
      question: cleanText(output.update.question, SESSION_TEXT_LIMITS.listItem),
      verdict:
        verdict && verdictReason
          ? {
              reason: verdictReason,
              segmentIds: resolveAliases(
                verdict.segments,
                context.shown.segmentIds,
                "S"
              ),
              status: verdict.status,
            }
          : null,
    },
  };
};
