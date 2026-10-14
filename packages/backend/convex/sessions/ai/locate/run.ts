import { type Infer, v } from "convex/values";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import { type ActionCtx, internalQuery } from "../../../_generated/server";
import {
  type calloutTargetValidator,
  elementRefValidator,
} from "../../validators";
import { loadSessionCapture } from "../../views/detail";
import type { ResolvedProposal } from "../analysis_model";
import { attemptGeneration } from "../attempt_generation";
import { type LocateQuestion, locateQuestion } from "./candidates";
import {
  generateLocations,
  type LocateRequest,
  locatePrompt,
  resolveLocations,
} from "./model";

const calloutAnchorValidator = v.object({
  calloutSegmentId: v.union(v.id("sessionSegments"), v.null()),
  evidenceIds: v.array(v.id("sessionEvidence")),
  segmentIds: v.array(v.id("sessionSegments")),
});

const locateQuestionValidator = v.object({
  candidates: v.array(
    v.object({
      element: elementRefValidator,
      interaction: v.union(v.string(), v.null()),
    })
  ),
  evidenceId: v.id("sessionEvidence"),
  passage: v.union(v.string(), v.null()),
  viewport: v.union(
    v.null(),
    v.object({ height: v.number(), width: v.number() })
  ),
});

type StoredProposal = ResolvedProposal<
  Id<"sessionSegments">,
  Id<"sessionEvidence">
>;
type LocatedProposal = StoredProposal & {
  calloutTarget?: Infer<typeof calloutTargetValidator>;
};

export const loadLocateQuestions = internalQuery({
  args: {
    anchors: v.array(calloutAnchorValidator),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const capture = await loadSessionCapture(ctx, args.sessionId);
    return args.anchors.map((anchor) => locateQuestion(anchor, capture));
  },
  returns: v.array(v.union(v.null(), locateQuestionValidator)),
});

export const locateCallouts = async (
  ctx: ActionCtx,
  options: {
    label: string;
    proposals: StoredProposal[];
    sessionId: Id<"sessions">;
  }
): Promise<LocatedProposal[]> => {
  const questions: (LocateQuestion | null)[] = await ctx.runQuery(
    internal.sessions.ai.locate.run.loadLocateQuestions,
    {
      anchors: options.proposals.map(
        ({ calloutSegmentId, evidenceIds, segmentIds }) => ({
          calloutSegmentId,
          evidenceIds,
          segmentIds,
        })
      ),
      sessionId: options.sessionId,
    }
  );
  const asked = options.proposals.flatMap((proposal, position) => {
    const question = questions[position];
    return question && question.candidates.length > 0
      ? [{ position, question, request: locateRequest(proposal, question) }]
      : [];
  });
  if (asked.length === 0) {
    return options.proposals;
  }
  const requests = asked.map(({ request }) => request);
  const output = await attemptGeneration(
    () => generateLocations(locatePrompt(requests)),
    `locating callouts of ${options.label}`
  );
  const located = output ? resolveLocations(output, requests) : [];
  return options.proposals.map((proposal, position) => {
    const askedIndex = asked.findIndex((entry) => entry.position === position);
    const element = located[askedIndex];
    const question = asked[askedIndex]?.question;
    return element && question
      ? {
          ...proposal,
          calloutTarget: { element, evidenceId: question.evidenceId },
        }
      : proposal;
  });
};

const locateRequest = (
  proposal: StoredProposal,
  question: LocateQuestion
): LocateRequest => ({
  label: proposal.callout ?? proposal.need,
  need: proposal.need,
  question,
});
