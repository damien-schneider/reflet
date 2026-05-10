import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

interface DbContext {
  db: QueryCtx["db"];
}

export async function requireOwnedFeedback(
  ctx: DbContext,
  organizationId: Id<"organizations">,
  feedbackId: Id<"feedback">
): Promise<Doc<"feedback">> {
  const feedback = await ctx.db.get(feedbackId);
  if (!feedback) {
    throw new Error("Feedback not found");
  }
  if (feedback.organizationId !== organizationId) {
    throw new Error("Feedback does not belong to this organization");
  }
  return feedback;
}

export async function requireOwnedWorkItem(
  ctx: DbContext,
  organizationId: Id<"organizations">,
  workItemId: Id<"autopilotWorkItems">
): Promise<Doc<"autopilotWorkItems">> {
  const workItem = await ctx.db.get(workItemId);
  if (!workItem) {
    throw new Error("Task not found");
  }
  if (workItem.organizationId !== organizationId) {
    throw new Error("Task does not belong to this organization");
  }
  return workItem;
}

async function requireOwnedCompetitor(
  ctx: DbContext,
  organizationId: Id<"organizations">,
  competitorId: Id<"autopilotCompetitors">
): Promise<void> {
  const competitor = await ctx.db.get(competitorId);
  if (!competitor) {
    throw new Error("Competitor not found");
  }
  if (competitor.organizationId !== organizationId) {
    throw new Error("Competitor does not belong to this organization");
  }
}

export async function requireOwnedLead(
  ctx: DbContext,
  organizationId: Id<"organizations">,
  leadId: Id<"autopilotLeads">
): Promise<Doc<"autopilotLeads">> {
  const lead = await ctx.db.get(leadId);
  if (!lead) {
    throw new Error("Lead not found");
  }
  if (lead.organizationId !== organizationId) {
    throw new Error("Lead does not belong to this organization");
  }
  return lead;
}

export async function requireOwnedDocumentRelations(
  ctx: DbContext,
  args: {
    linkedCompetitorId?: Id<"autopilotCompetitors">;
    linkedLeadId?: Id<"autopilotLeads">;
    linkedWorkItemId?: Id<"autopilotWorkItems">;
    organizationId: Id<"organizations">;
  }
): Promise<void> {
  if (args.linkedWorkItemId !== undefined) {
    await requireOwnedWorkItem(ctx, args.organizationId, args.linkedWorkItemId);
  }
  if (args.linkedCompetitorId !== undefined) {
    await requireOwnedCompetitor(
      ctx,
      args.organizationId,
      args.linkedCompetitorId
    );
  }
  if (args.linkedLeadId !== undefined) {
    await requireOwnedLead(ctx, args.organizationId, args.linkedLeadId);
  }
}
