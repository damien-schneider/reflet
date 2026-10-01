import { type Infer, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../_generated/server";
import { statusFieldsFor } from "../feedback/status_target";
import { feedbackStatus } from "../shared/validators";

export const preflight = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const columns = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const feedback = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .take(1000);
    return {
      columns: columns.map((column) => ({
        existingLifecycles: feedback
          .filter((item) => item.organizationStatusId === column._id)
          .map((item) => item.status),
        id: column._id,
        name: column.name,
        semanticStatus: column.semanticStatus,
      })),
      inconsistentFeedbackIds: feedback
        .filter(
          (item) =>
            columns.find((column) => column._id === item.organizationStatusId)
              ?.semanticStatus !== item.status
        )
        .map((item) => item._id),
      inspected: feedback.length,
      sampleLimit: 1000,
    };
  },
  returns: v.object({
    columns: v.array(
      v.object({
        existingLifecycles: v.array(feedbackStatus),
        id: v.id("organizationStatuses"),
        name: v.string(),
        semanticStatus: v.optional(feedbackStatus),
      })
    ),
    inconsistentFeedbackIds: v.array(v.id("feedback")),
    inspected: v.number(),
    sampleLimit: v.number(),
  }),
});

const reconciliationArgs = v.object({
  cursor: v.union(v.string(), v.null()),
  meanings: v.array(
    v.object({
      semanticStatus: feedbackStatus,
      statusId: v.id("organizationStatuses"),
    })
  ),
  organizationId: v.id("organizations"),
});

export const reconcile = internalMutation({
  args: reconciliationArgs.fields,
  handler: async (ctx, args) => {
    await configureColumnMeanings(ctx, args);
    const batch = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .paginate({ cursor: args.cursor, numItems: 100 });
    let reconciled = 0;
    for (const feedback of batch.page) {
      if (await reconcileFeedbackLifecycle(ctx, feedback)) {
        reconciled++;
      }
    }

    return {
      continueCursor: batch.continueCursor,
      inspected: batch.page.length,
      isDone: batch.isDone,
      reconciled,
    };
  },
  returns: v.object({
    continueCursor: v.string(),
    inspected: v.number(),
    isDone: v.boolean(),
    reconciled: v.number(),
  }),
});

async function configureColumnMeanings(
  ctx: MutationCtx,
  args: Infer<typeof reconciliationArgs>
) {
  const columns = await ctx.db
    .query("organizationStatuses")
    .withIndex("by_organization", (q) =>
      q.eq("organizationId", args.organizationId)
    )
    .collect();
  for (const meaning of args.meanings) {
    const column = columns.find(
      (candidate) => candidate._id === meaning.statusId
    );
    if (!column) {
      throw new Error("Status does not belong to this organization");
    }
    if (
      column.semanticStatus &&
      column.semanticStatus !== meaning.semanticStatus
    ) {
      throw new Error("An established lifecycle meaning cannot change");
    }
    await ctx.db.patch(column._id, {
      semanticStatus: meaning.semanticStatus,
    });
  }
  const unconfigured = columns.some(
    (column) =>
      !(
        column.semanticStatus ||
        args.meanings.some((meaning) => meaning.statusId === column._id)
      )
  );
  if (unconfigured) {
    throw new Error(
      "Specify an explicit lifecycle meaning for every unconfigured column"
    );
  }
}

async function reconcileFeedbackLifecycle(
  ctx: MutationCtx,
  feedback: Doc<"feedback">
) {
  const currentColumn = feedback.organizationStatusId
    ? await ctx.db.get(feedback.organizationStatusId)
    : null;
  if (
    currentColumn?.semanticStatus === feedback.status &&
    (feedback.status === "completed" || feedback.completedAt === undefined)
  ) {
    return false;
  }
  const target = await statusFieldsFor(ctx, {
    organizationId: feedback.organizationId,
    status: feedback.status,
  });
  await ctx.db.patch(feedback._id, {
    ...target,
    completedAt:
      feedback.status === "completed" ? feedback.completedAt : undefined,
  });
  return true;
}
