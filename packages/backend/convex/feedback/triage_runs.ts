import { type Infer, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import {
  internalMutation,
  type MutationCtx,
  query,
} from "../_generated/server";
import { requireOrgMember } from "../shared/access";
import { afterApproval } from "./after_create";
import {
  NEEDS_CLARIFICATION_THRESHOLD,
  publicationState,
} from "./property_values";
import {
  triageAnswer,
  triageInput,
  triageRunFields,
  triageTag,
} from "./triage_contract";
import {
  applyPolicyWithoutVerdict,
  decidePublication,
  retriageEditedSubmission,
} from "./triage_publication";
import {
  buildQuestions,
  MAX_TAGS_PER_FEEDBACK,
  MIN_TAG_PROBABILITY,
  TRIAGE_CRITERIA_VERSION,
  TRIAGE_INPUT_VERSION,
  TRIAGE_MODEL,
  WITHHOLD_JUNK_THRESHOLD,
} from "./triage_questions";

export const start = internalMutation({
  args: {
    feedbackId: v.id("feedback"),
    input: triageInput,
    tags: v.array(triageTag),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }
    return ctx.db.insert("feedbackTriageRuns", {
      ...args,
      applyModeration:
        publicationState(feedback) === "pending" &&
        feedback.publicationReviewedAt === undefined,
      criteriaVersion: TRIAGE_CRITERIA_VERSION,
      inputVersion: TRIAGE_INPUT_VERSION,
      model: TRIAGE_MODEL,
      organizationId: feedback.organizationId,
      questions: Object.entries(buildQuestions(args.tags)).map(
        ([id, question]) => ({
          criteria: question.criteria,
          id,
          instructions: question.instructions,
        })
      ),
      startedAt: Date.now(),
      status: "running",
      thresholds: {
        clarification: NEEDS_CLARIFICATION_THRESHOLD,
        junk: WITHHOLD_JUNK_THRESHOLD,
        maxTags: MAX_TAGS_PER_FEEDBACK,
        tag: MIN_TAG_PROBABILITY,
      },
    });
  },
  returns: v.id("feedbackTriageRuns"),
});

export const fail = internalMutation({
  args: { error: v.string(), runId: v.id("feedbackTriageRuns") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (run?.status !== "running") {
      return null;
    }
    const target = await runTarget(ctx, run);
    const publicationDecision =
      target && !target.edited
        ? await applyPolicyWithoutVerdict(ctx, target.feedback, run)
        : undefined;
    await ctx.db.patch(args.runId, {
      completedAt: Date.now(),
      error: args.error,
      publicationDecision,
      status: "failed",
    });
    if (target?.edited) {
      await retriageEditedSubmission(ctx, run);
    }
    return null;
  },
  returns: v.null(),
});

async function validSuggestedTagIds(
  ctx: MutationCtx,
  feedback: Doc<"feedback">,
  tagIds: Doc<"tags">["_id"][]
) {
  const excluded = new Set(feedback.aiTagExclusions);
  const wanted = new Set(tagIds.filter((id) => !excluded.has(id)));
  for (const tagId of wanted) {
    const tag = await ctx.db.get(tagId);
    if (tag?.organizationId !== feedback.organizationId) {
      wanted.delete(tagId);
    }
  }
  return wanted;
}

function tagSuggestionOutcome(options: {
  applied: boolean;
  excluded: boolean;
  human: boolean;
  probability: number;
  threshold: number;
}): NonNullable<Doc<"feedbackTriageRuns">["suggestions"]>[number]["outcome"] {
  if (options.excluded) {
    return "refused";
  }
  if (options.human) {
    return "human";
  }
  if (options.applied) {
    return "applied";
  }
  return options.probability < options.threshold
    ? "below_threshold"
    : "not_selected";
}

async function applyTagSuggestions(
  ctx: MutationCtx,
  feedback: Doc<"feedback">,
  options: {
    run: Doc<"feedbackTriageRuns">;
    tagIds: Doc<"tags">["_id"][];
    answers: { questionId: string; probability: number }[];
  }
) {
  const links = await ctx.db
    .query("feedbackTags")
    .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
    .collect();
  const excluded = new Set(feedback.aiTagExclusions);
  const wanted = await validSuggestedTagIds(ctx, feedback, options.tagIds);
  for (const link of links) {
    if (link.appliedByAi && !wanted.has(link.tagId)) {
      await ctx.db.delete(link._id);
    }
  }
  for (const tagId of wanted) {
    if (links.some((link) => link.tagId === tagId)) {
      continue;
    }
    await ctx.db.insert("feedbackTags", {
      appliedByAi: true,
      feedbackId: feedback._id,
      tagId,
    });
  }
  return options.run.tags.map((tag) => {
    const probability =
      options.answers.find((answer) => answer.questionId === `tag:${tag._id}`)
        ?.probability ?? 0;
    const link = links.find((existing) => existing.tagId === tag._id);
    const outcome = tagSuggestionOutcome({
      applied: wanted.has(tag._id),
      excluded: excluded.has(tag._id),
      human: Boolean(link && !link.appliedByAi),
      probability,
      threshold: options.run.thresholds.tag,
    });
    return { name: tag.name, outcome, probability, tagId: tag._id };
  });
}

const triageResultValidator = v.object({
  answers: v.array(triageAnswer),
  junk: v.number(),
  needsReview: v.number(),
  runId: v.id("feedbackTriageRuns"),
  tagIds: v.array(v.id("tags")),
  usefulness: v.number(),
});
type TriageResult = Infer<typeof triageResultValidator>;

async function runTarget(ctx: MutationCtx, run: Doc<"feedbackTriageRuns">) {
  const feedback = await ctx.db.get(run.feedbackId);
  const latestRun = await ctx.db
    .query("feedbackTriageRuns")
    .withIndex("by_feedback", (q) => q.eq("feedbackId", run.feedbackId))
    .order("desc")
    .first();
  if (!feedback || feedback.deletedAt || latestRun?._id !== run._id) {
    return null;
  }
  const edited =
    feedback.title !== run.input.title ||
    feedback.description !== run.input.description;
  return { edited, feedback };
}

function validateRunAnswers(
  run: Doc<"feedbackTriageRuns">,
  result: TriageResult
) {
  if (
    run.questions.some(
      (question) =>
        !result.answers.some(
          (answer) =>
            answer.questionId === question.id &&
            Number.isFinite(answer.probability) &&
            answer.probability >= 0 &&
            answer.probability <= 1
        )
    )
  ) {
    throw new Error("Incomplete triage result");
  }
}

async function saveRunVerdict(
  ctx: MutationCtx,
  feedback: Doc<"feedback">,
  options: {
    run: Doc<"feedbackTriageRuns">;
    result: TriageResult;
    suggestions: NonNullable<Doc<"feedbackTriageRuns">["suggestions"]>;
  }
) {
  const { run, result, suggestions } = options;
  const now = Date.now();
  const { decision, isApproved } = await decidePublication(ctx, feedback, {
    run,
    withhold: result.junk >= run.thresholds.junk,
  });
  await ctx.db.patch(feedback._id, {
    aiJunk: result.junk,
    aiNeedsReview: result.needsReview,
    aiUsefulness: result.usefulness,
    aiUsefulnessGeneratedAt: now,
    isApproved,
    updatedAt: now,
  });
  if (isApproved && !feedback.isApproved) {
    await afterApproval(ctx, { ...feedback, isApproved });
  }
  await ctx.db.patch(run._id, {
    answers: result.answers,
    completedAt: now,
    publicationDecision: decision,
    status: "completed",
    suggestions,
  });
}

export const complete = internalMutation({
  args: triageResultValidator.fields,
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (run?.status !== "running") {
      return false;
    }
    const target = await runTarget(ctx, run);
    if (!target || target.edited) {
      await ctx.db.patch(run._id, {
        answers: args.answers,
        completedAt: Date.now(),
        status: "stale",
      });
      if (target?.edited) {
        await retriageEditedSubmission(ctx, run);
      }
      return false;
    }
    const { feedback } = target;
    validateRunAnswers(run, args);
    const suggestions = await applyTagSuggestions(ctx, feedback, {
      answers: args.answers,
      run,
      tagIds: args.tagIds,
    });
    await saveRunVerdict(ctx, feedback, { result: args, run, suggestions });
    return true;
  },
  returns: v.boolean(),
});

export const list = query({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return [];
    }
    await requireOrgMember(ctx, feedback.organizationId);
    const runs = await ctx.db
      .query("feedbackTriageRuns")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .order("desc")
      .take(10);
    const links = await ctx.db
      .query("feedbackTags")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();
    return runs.map((run) => ({
      ...run,
      currentSuggestions:
        run.suggestions?.map((suggestion) => {
          const current = links.find((link) => link.tagId === suggestion.tagId);
          let currentOutcome = "Not applied";
          if (feedback.aiTagExclusions?.includes(suggestion.tagId)) {
            currentOutcome = "Refused by a teammate";
          } else if (current && !current.appliedByAi) {
            currentOutcome = "Confirmed or corrected by a teammate";
          } else if (current) {
            currentOutcome = "Applied by JEV";
          }
          return { currentOutcome, tagId: suggestion.tagId };
        }) ?? [],
    }));
  },
  returns: v.array(
    v.object({
      ...triageRunFields,
      _creationTime: v.number(),
      _id: v.id("feedbackTriageRuns"),
      currentSuggestions: v.array(
        v.object({ currentOutcome: v.string(), tagId: v.id("tags") })
      ),
    })
  ),
});
