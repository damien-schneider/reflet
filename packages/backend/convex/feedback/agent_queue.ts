import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";
import { PRIORITY_RANK } from "../intelligence/feedback_integration";
import { feedbackStatus } from "../shared/validators";
import { shapeFeedbackDetail } from "./api_public_list";
import { changeFeedbackStatus } from "./status_change";

export const CLAIM_TTL_MS = 2 * 60 * 60 * 1000;
const DEFAULT_QUEUE_LIMIT = 10;
const DEFAULT_QUEUE_STATUSES: Doc<"feedback">["status"][] = [
  "open",
  "under_review",
  "planned",
];

const queueFilterArgs = {
  limit: v.optional(v.number()),
  organizationId: v.id("organizations"),
  statuses: v.optional(v.array(feedbackStatus)),
  tagIds: v.optional(v.array(v.id("tags"))),
};

interface QueueFilter {
  limit?: number;
  organizationId: Id<"organizations">;
  statuses?: Doc<"feedback">["status"][];
  tagIds?: Id<"tags">[];
}

function claimIsLive(feedback: Doc<"feedback">, now: number): boolean {
  return (
    feedback.claimedBy !== undefined &&
    (feedback.claimedAt ?? 0) > now - CLAIM_TTL_MS
  );
}

function priorityRank(feedback: Doc<"feedback">): number {
  return PRIORITY_RANK[feedback.priority ?? feedback.aiPriority ?? "none"] ?? 0;
}

function compareQueueOrder(a: Doc<"feedback">, b: Doc<"feedback">): number {
  return (
    priorityRank(b) - priorityRank(a) ||
    b.voteCount - a.voteCount ||
    a.createdAt - b.createdAt
  );
}

async function hasAnyTag(
  ctx: QueryCtx,
  feedbackId: Id<"feedback">,
  tagIds: Set<Id<"tags">>
): Promise<boolean> {
  const links = await ctx.db
    .query("feedbackTags")
    .withIndex("by_feedback", (q) => q.eq("feedbackId", feedbackId))
    .collect();
  return links.some((link) => tagIds.has(link.tagId));
}

async function pickNext(
  ctx: QueryCtx,
  filter: QueueFilter
): Promise<Doc<"feedback">[]> {
  const now = Date.now();
  const statuses = new Set(
    filter.statuses?.length ? filter.statuses : DEFAULT_QUEUE_STATUSES
  );
  const tagIds = new Set(filter.tagIds ?? []);

  // ponytail: full org scan, add a by_org_status index if queues grow past a few thousand items
  const all = await ctx.db
    .query("feedback")
    .withIndex("by_organization", (q) =>
      q.eq("organizationId", filter.organizationId)
    )
    .collect();
  const eligible = all.filter(
    (feedback) =>
      feedback.isApproved &&
      !feedback.deletedAt &&
      !feedback.isMerged &&
      statuses.has(feedback.status) &&
      !claimIsLive(feedback, now)
  );
  const tagged =
    tagIds.size === 0
      ? eligible
      : (
          await Promise.all(
            eligible.map(async (feedback) =>
              (await hasAnyTag(ctx, feedback._id, tagIds)) ? feedback : null
            )
          )
        ).filter((feedback) => feedback !== null);

  return tagged
    .sort(compareQueueOrder)
    .slice(0, filter.limit ?? DEFAULT_QUEUE_LIMIT);
}

async function claim(
  ctx: MutationCtx,
  feedback: Doc<"feedback">,
  claimedBy: string
) {
  const now = Date.now();
  await ctx.db.patch(feedback._id, {
    claimedAt: now,
    claimedBy,
    updatedAt: now,
  });
  await changeFeedbackStatus(ctx, feedback, {
    actorId: claimedBy,
    source: "agent",
    status: "in_progress",
  });
  const claimed = await ctx.db.get(feedback._id);
  if (!claimed) {
    throw new Error("Feedback not found");
  }
  return await shapeFeedbackDetail(ctx, claimed, {
    includePrivateContext: true,
  });
}

export const nextFeedback = internalQuery({
  args: queueFilterArgs,
  handler: async (ctx, args) => {
    const items = await pickNext(ctx, args);
    return await Promise.all(
      items.map((feedback) =>
        shapeFeedbackDetail(ctx, feedback, { includePrivateContext: true })
      )
    );
  },
});

export const claimNext = internalMutation({
  args: { ...queueFilterArgs, claimedBy: v.string() },
  handler: async (ctx, args) => {
    const [feedback] = await pickNext(ctx, { ...args, limit: 1 });
    if (!feedback) {
      return null;
    }
    return await claim(ctx, feedback, args.claimedBy);
  },
});

export const claimFeedback = internalMutation({
  args: {
    claimedBy: v.string(),
    feedbackId: v.id("feedback"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.organizationId !== args.organizationId) {
      throw new Error("Feedback not found");
    }
    const claimedByOther =
      claimIsLive(feedback, Date.now()) &&
      feedback.claimedBy !== args.claimedBy;
    if (claimedByOther) {
      throw new Error(`Feedback is already claimed by ${feedback.claimedBy}`);
    }
    return await claim(ctx, feedback, args.claimedBy);
  },
});
