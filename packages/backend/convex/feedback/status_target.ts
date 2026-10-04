import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { STATUS_DEFINITIONS } from "../organizations/status_definitions";
import type { FeedbackStatusValue } from "../shared/validators";
import type { StatusChange } from "./status_change";

export async function statusFieldsFor(
  ctx: MutationCtx,
  options: {
    organizationId: Id<"organizations">;
    status: FeedbackStatusValue;
  }
) {
  const statuses = await ctx.db
    .query("organizationStatuses")
    .withIndex("by_organization", (q) =>
      q.eq("organizationId", options.organizationId)
    )
    .collect();
  const matching = statuses
    .filter((column) => column.semanticStatus === options.status)
    .sort((a, b) => a.order - b.order)[0];
  if (matching) {
    return { organizationStatusId: matching._id, status: options.status };
  }
  const { group, ...definition } = STATUS_DEFINITIONS[options.status];
  const now = Date.now();
  const organizationStatusId = await ctx.db.insert("organizationStatuses", {
    ...definition,
    createdAt: now,
    order:
      statuses.reduce((max, column) => Math.max(max, column.order), -1) + 1,
    organizationId: options.organizationId,
    semanticStatus: options.status,
    updatedAt: now,
  });
  return { organizationStatusId, status: options.status };
}

export async function resolveStatusTarget(
  ctx: MutationCtx,
  feedback: Doc<"feedback">,
  change: StatusChange
) {
  if (change.organizationStatusId === null) {
    throw new ConvexError("Choose a status instead of clearing it");
  }
  if (change.organizationStatusId !== undefined) {
    const column = await ctx.db.get(change.organizationStatusId);
    if (!column || column.organizationId !== feedback.organizationId) {
      throw new ConvexError("Invalid status for this organization");
    }
    if (!column.semanticStatus) {
      throw new ConvexError(
        "This column needs a lifecycle meaning before feedback can move into it"
      );
    }
    if (
      change.status !== undefined &&
      change.status !== column.semanticStatus
    ) {
      throw new ConvexError("Status and column disagree");
    }
    return { organizationStatusId: column._id, status: column.semanticStatus };
  }
  const status = change.status ?? feedback.status;
  if (feedback.organizationStatusId) {
    const column = await ctx.db.get(feedback.organizationStatusId);
    if (
      column?.organizationId === feedback.organizationId &&
      column.semanticStatus === status
    ) {
      return { organizationStatusId: column._id, status };
    }
  }
  return statusFieldsFor(ctx, {
    organizationId: feedback.organizationId,
    status,
  });
}
