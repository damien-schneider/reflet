import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { insertOrganizationFeedback } from "../../feedback/api_public_write";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from "../../shared/constants";
import { sessionActorValidator } from "../access";
import { buildSessionBrief } from "../brief/build";
import { loadBriefInput } from "../brief/input";
import { truncateText } from "../formatters";
import { loadOwnProposal } from "./proposals";

export const materialize = internalMutation({
  args: { actor: sessionActorValidator, proposalId: v.string() },
  handler: async (ctx, args) => {
    const { child: proposal, session } = await loadOwnProposal(ctx, args);
    if (proposal.feedbackId) {
      return { created: false, feedbackId: proposal.feedbackId };
    }
    const brief = buildSessionBrief(
      await loadBriefInput(ctx, {
        chosenEvidenceIds: proposal.evidenceIds,
        proposals: [proposal],
        session,
      })
    );
    const { feedbackId } = await insertOrganizationFeedback(ctx, {
      authorId: args.actor.userId,
      description: truncateText(brief.markdown, MAX_DESCRIPTION_LENGTH),
      isInternal: true,
      organizationId: session.organizationId,
      sessionProposalId: proposal._id,
      title: truncateText(proposal.need.trim(), MAX_TITLE_LENGTH),
    });
    await ctx.db.patch(proposal._id, {
      feedbackId,
      humanTouchedAt: Date.now(),
    });
    return { created: true, feedbackId };
  },
});
