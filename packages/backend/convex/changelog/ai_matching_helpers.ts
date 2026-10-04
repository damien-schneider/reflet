import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { feedbackStatus } from "../shared/validators";
import { releaseCommitValidator } from "./tableFields";

const MAX_FEEDBACK_ITEMS = 50;

export const getReleaseOrganizationId = internalQuery({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, args) =>
    (await ctx.db.get(args.releaseId))?.organizationId ?? null,
  returns: v.union(v.id("organizations"), v.null()),
});

export const getReleaseAndFeedback = internalQuery({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);
    if (!release) {
      return null;
    }

    const existingLinks = await ctx.db
      .query("releaseFeedback")
      .withIndex("by_release", (q) => q.eq("releaseId", args.releaseId))
      .collect();

    const linkedFeedbackIds = new Set(
      existingLinks.map((l) => l.feedbackId.toString())
    );

    const allFeedback = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", release.organizationId)
      )
      .collect();

    const feedbackItems = allFeedback
      .filter(
        (f) =>
          !(f.deletedAt || linkedFeedbackIds.has(f._id.toString())) &&
          ["open", "under_review", "planned", "in_progress"].includes(f.status)
      )
      .slice(0, MAX_FEEDBACK_ITEMS)
      .map((f) => ({
        _id: f._id,
        description: f.description,
        status: f.status,
        title: f.title,
        voteCount: f.voteCount ?? 0,
      }));

    const snapshot = await ctx.db
      .query("releaseCommits")
      .withIndex("by_release", (q) => q.eq("releaseId", args.releaseId))
      .first();

    return { commits: snapshot?.commits ?? [], feedbackItems };
  },
  returns: v.union(
    v.null(),
    v.object({
      commits: v.array(releaseCommitValidator),
      feedbackItems: v.array(
        v.object({
          _id: v.id("feedback"),
          description: v.string(),
          status: feedbackStatus,
          title: v.string(),
          voteCount: v.number(),
        })
      ),
    })
  ),
});
