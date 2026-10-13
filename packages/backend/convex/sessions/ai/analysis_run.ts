import type { FunctionArgs } from "convex/server";
import { type Infer, v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import {
  internalAction,
  internalQuery,
  type QueryCtx,
} from "../../_generated/server";
import {
  isCurrentRun,
  isReplaceableByAnalysis,
  loadHandedOffProposalIds,
  loadRefiningProposal,
} from "./analysis_apply";
import {
  generateProposalRefinement,
  generateSessionAnalysis,
  resolveProposal,
  resolveProposals,
} from "./analysis_model";
import {
  type AnalysisSource,
  prepareAnalysisPrompt,
  prepareRefinementPrompt,
} from "./analysis_prompt";
import { ANALYSIS_NOT_CONFIGURED, isAnalysisConfigured } from "./configuration";
import { loadContinuationTarget } from "./continuation/material";
import {
  generateContinuationAnalysis,
  resolveContinuation,
} from "./continuation/model";
import { prepareContinuationPrompt } from "./continuation/prompt";

const ANALYSIS_FAILED =
  "The AI couldn't read this session right now. Try again.";
const REFINEMENT_FAILED =
  "The AI couldn't update this proposal right now. Try again.";

const preparedPromptFields = {
  evidenceIds: v.array(v.id("sessionEvidence")),
  prompt: v.string(),
  segmentIds: v.array(v.id("sessionSegments")),
};
const analysisMaterialValidator = v.object({
  ...preparedPromptFields,
  continuation: v.union(
    v.null(),
    v.object({ answered: v.boolean(), intentionRevision: v.number() })
  ),
  transcriptRevision: v.number(),
});
type AnalysisMaterial = Infer<typeof analysisMaterialValidator>;
const refinementMaterialValidator = v.object(preparedPromptFields);

const loadAnalysisSource = async (
  ctx: QueryCtx,
  session: Doc<"sessions">,
  refinedProposalId: Id<"sessionProposals"> | null
): Promise<AnalysisSource<Id<"sessionSegments">, Id<"sessionEvidence">>> => {
  const [segments, batches, evidence, proposals, handedOffIds] =
    await Promise.all([
      ctx.db
        .query("sessionSegments")
        .withIndex("by_session_start", (q) => q.eq("sessionId", session._id))
        .collect(),
      ctx.db
        .query("sessionEventBatches")
        .withIndex("by_session_start", (q) => q.eq("sessionId", session._id))
        .collect(),
      ctx.db
        .query("sessionEvidence")
        .withIndex("by_session_at", (q) => q.eq("sessionId", session._id))
        .collect(),
      ctx.db
        .query("sessionProposals")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect(),
      loadHandedOffProposalIds(ctx, session._id),
    ]);
  return {
    events: batches.flatMap(({ events }) => events),
    evidence,
    handledProposals: proposals.filter(
      (proposal) =>
        proposal._id !== refinedProposalId &&
        proposal.mergedIntoId === undefined &&
        !isReplaceableByAnalysis(proposal, handedOffIds)
    ),
    segments,
    title: session.title,
  };
};

export const loadAnalysisMaterial = internalQuery({
  args: { runId: v.string(), sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!isCurrentRun(session, args.runId)) {
      return null;
    }
    const source = await loadAnalysisSource(ctx, session, null);
    const target = await loadContinuationTarget(ctx, session);
    const prepared = target
      ? prepareContinuationPrompt(source, target.source)
      : prepareAnalysisPrompt(source);
    return {
      ...prepared,
      continuation: target
        ? {
            answered: target.source.answers.length > 0,
            intentionRevision: target.source.intention.revision,
          }
        : null,
      transcriptRevision: session.transcriptRevision,
    };
  },
  returns: v.union(v.null(), analysisMaterialValidator),
});

export const loadRefinementMaterial = internalQuery({
  args: { proposalId: v.id("sessionProposals"), runId: v.string() },
  handler: async (ctx, args) => {
    const target = await loadRefiningProposal(ctx, args);
    if (!target) {
      return null;
    }
    const source = await loadAnalysisSource(
      ctx,
      target.session,
      target.proposal._id
    );
    return prepareRefinementPrompt(source, {
      ...target.proposal,
      clarification: target.refinement.text,
    });
  },
  returns: v.union(v.null(), refinementMaterialValidator),
});

const attemptGeneration = async <Output>(
  generate: () => Promise<Output>,
  label: string
): Promise<Output | null> => {
  try {
    return await generate();
  } catch (error) {
    const errorClass = error instanceof Error ? error.name : typeof error;
    console.error(`[sessions.ai] ${label} failed: ${errorClass}`);
    return null;
  }
};

type ApplyAnalysisArgs = FunctionArgs<
  typeof internal.sessions.ai.analysis_apply.applyAnalysis
>;
type GeneratedAnalysis = Pick<
  ApplyAnalysisArgs,
  "continuation" | "mergeGroups" | "proposals"
>;

const generateAnalysis = async (
  material: AnalysisMaterial,
  label: string
): Promise<GeneratedAnalysis | null> => {
  const { continuation } = material;
  if (!continuation) {
    const output = await attemptGeneration(
      () => generateSessionAnalysis(material.prompt),
      label
    );
    if (!output) {
      return null;
    }
    const { mergeGroups, proposals } = resolveProposals(output, material);
    return { mergeGroups, proposals };
  }
  const output = await attemptGeneration(
    () => generateContinuationAnalysis(material.prompt),
    label
  );
  if (!output) {
    return null;
  }
  const resolved = resolveContinuation(output, {
    answered: continuation.answered,
    shown: material,
  });
  return {
    continuation: {
      intentionRevision: continuation.intentionRevision,
      suggestions: resolved.suggestions,
      update: resolved.update,
    },
    mergeGroups: resolved.mergeGroups,
    proposals: resolved.proposals,
  };
};

export const runAnalysis = internalAction({
  args: { runId: v.string(), sessionId: v.id("sessions") },
  handler: async (ctx, args): Promise<null> => {
    const material: AnalysisMaterial | null = await ctx.runQuery(
      internal.sessions.ai.analysis_run.loadAnalysisMaterial,
      args
    );
    if (material === null) {
      return null;
    }
    const result = isAnalysisConfigured()
      ? await generateAnalysis(
          material,
          `analysis ${args.runId} of session ${args.sessionId}`
        )
      : null;
    if (result === null) {
      await ctx.runMutation(internal.sessions.ai.analysis_apply.failAnalysis, {
        ...args,
        error: isAnalysisConfigured()
          ? ANALYSIS_FAILED
          : ANALYSIS_NOT_CONFIGURED,
      });
      return null;
    }
    await ctx.runMutation(internal.sessions.ai.analysis_apply.applyAnalysis, {
      ...args,
      ...result,
      transcriptRevision: material.transcriptRevision,
    });
    return null;
  },
  returns: v.null(),
});

export const runRefinement = internalAction({
  args: { proposalId: v.id("sessionProposals"), runId: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const material: Infer<typeof refinementMaterialValidator> | null =
      await ctx.runQuery(
        internal.sessions.ai.analysis_run.loadRefinementMaterial,
        args
      );
    if (material === null) {
      return null;
    }
    const output = isAnalysisConfigured()
      ? await attemptGeneration(
          () => generateProposalRefinement(material.prompt),
          `refinement ${args.runId} of proposal ${args.proposalId}`
        )
      : null;
    const proposal = output ? resolveProposal(output, material) : null;
    if (proposal === null) {
      await ctx.runMutation(
        internal.sessions.ai.analysis_apply.failRefinement,
        {
          ...args,
          error: isAnalysisConfigured()
            ? REFINEMENT_FAILED
            : ANALYSIS_NOT_CONFIGURED,
        }
      );
      return null;
    }
    await ctx.runMutation(internal.sessions.ai.analysis_apply.applyRefinement, {
      ...args,
      proposal,
    });
    return null;
  },
  returns: v.null(),
});
