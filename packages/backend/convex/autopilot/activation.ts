import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { internalQuery } from "../_generated/server";

type AgentName = "growth" | "sales" | "support";

interface ActivationResult {
  active: boolean;
  reason: string;
}

const checkManualOverride = (
  activationOverrides: string | undefined,
  agent: AgentName
): boolean | null => {
  if (!activationOverrides) {
    return null;
  }
  try {
    const overrides = JSON.parse(activationOverrides) as Record<
      string,
      boolean
    >;
    if (agent in overrides) {
      return overrides[agent] ?? null;
    }
  } catch {
    // Invalid JSON — no override
  }
  return null;
};

const checkGrowthActivation = async (
  ctx: QueryCtx,
  organizationId: Id<"organizations">
): Promise<ActivationResult> => {
  const doneWorkItems = await ctx.db
    .query("autopilotWorkItems")
    .withIndex("by_org_status", (q) =>
      q.eq("organizationId", organizationId).eq("status", "done")
    )
    .collect();

  const completedInitiatives = doneWorkItems.filter(
    (w) => w.type === "initiative"
  );

  if (completedInitiatives.length > 0) {
    return {
      active: true,
      reason: "First initiative completed — growth enabled",
    };
  }

  return {
    active: false,
    reason: "Need at least 1 completed initiative",
  };
};

const checkSalesActivation = async (
  ctx: QueryCtx,
  organizationId: Id<"organizations">
): Promise<ActivationResult> => {
  const productDef = await ctx.db
    .query("autopilotKnowledgeDocs")
    .withIndex("by_org_docType", (q) =>
      q.eq("organizationId", organizationId).eq("docType", "product_definition")
    )
    .unique();

  if (!productDef) {
    return {
      active: false,
      reason: "Need product definition before sales can start",
    };
  }

  const publishedContent = await ctx.db
    .query("autopilotDocuments")
    .withIndex("by_org_type", (q) => q.eq("organizationId", organizationId))
    .collect();

  const hasPublished = publishedContent.some((d) => d.status === "published");

  if (!hasPublished) {
    return {
      active: false,
      reason: "Need at least 1 published content item",
    };
  }

  return { active: true, reason: "ICP doc + published content exists" };
};

const checkSupportActivation = async (
  ctx: QueryCtx,
  organizationId: Id<"organizations">
): Promise<ActivationResult> => {
  const config = await ctx.db
    .query("autopilotConfig")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .unique();

  if (config?.orgEmailAddress) {
    return {
      active: true,
      reason: "Support email configured",
    };
  }

  return {
    active: false,
    reason: "Need orgEmailAddress configured in autopilot settings",
  };
};

export const getActivationStatus = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    agent: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = args.agent as AgentName;

    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    const manualOverride = checkManualOverride(
      config?.activationOverrides,
      agent
    );

    if (manualOverride !== null) {
      return {
        active: manualOverride,
        reason: manualOverride ? "Manually activated" : "Manually deactivated",
      };
    }

    switch (agent) {
      case "growth":
        return checkGrowthActivation(ctx, args.organizationId);
      case "sales":
        return checkSalesActivation(ctx, args.organizationId);
      case "support":
        return checkSupportActivation(ctx, args.organizationId);
      default:
        return { active: true, reason: "Core agent — always active" };
    }
  },
});
