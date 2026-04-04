import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { internalQuery } from "../_generated/server";

type AgentName =
  | "security"
  | "architect"
  | "growth"
  | "sales"
  | "support"
  | "docs";

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

const checkSecurityActivation = (): ActivationResult => ({
  active: true,
  reason: "Security is always active (lightweight scans)",
});

const checkArchitectActivation = async (
  ctx: QueryCtx,
  organizationId: Id<"organizations">
): Promise<ActivationResult> => {
  const MIN_COMPLETED_RUNS_WITH_PR = 5;

  const completedRuns = await ctx.db
    .query("autopilotRuns")
    .withIndex("by_org_status", (q) =>
      q.eq("organizationId", organizationId).eq("status", "completed")
    )
    .collect();

  const runsWithPr = completedRuns.filter((r) => r.prUrl);

  if (runsWithPr.length >= MIN_COMPLETED_RUNS_WITH_PR) {
    return {
      active: true,
      reason: `${runsWithPr.length} PRs merged — architecture reviews enabled`,
    };
  }

  return {
    active: false,
    reason: `Need ${MIN_COMPLETED_RUNS_WITH_PR}+ merged PRs (current: ${runsWithPr.length})`,
  };
};

const checkGrowthActivation = async (
  ctx: QueryCtx,
  organizationId: Id<"organizations">
): Promise<ActivationResult> => {
  const completedInitiatives = await ctx.db
    .query("autopilotInitiatives")
    .withIndex("by_org_status", (q) =>
      q.eq("organizationId", organizationId).eq("status", "completed")
    )
    .collect();

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
  const icpDoc = await ctx.db
    .query("autopilotKnowledgeDocs")
    .withIndex("by_org_docType", (q) =>
      q.eq("organizationId", organizationId).eq("docType", "user_personas_icp")
    )
    .unique();

  if (!icpDoc) {
    return {
      active: false,
      reason: "Need ICP knowledge doc before sales can start",
    };
  }

  const publishedContent = await ctx.db
    .query("autopilotGrowthItems")
    .withIndex("by_org_status", (q) =>
      q.eq("organizationId", organizationId).eq("status", "published")
    )
    .first();

  if (!publishedContent) {
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

const checkDocsActivation = async (
  ctx: QueryCtx,
  organizationId: Id<"organizations">
): Promise<ActivationResult> => {
  const MIN_COMPLETED_INITIATIVES = 3;

  const completedInitiatives = await ctx.db
    .query("autopilotInitiatives")
    .withIndex("by_org_status", (q) =>
      q.eq("organizationId", organizationId).eq("status", "completed")
    )
    .collect();

  if (completedInitiatives.length >= MIN_COMPLETED_INITIATIVES) {
    return {
      active: true,
      reason: `${completedInitiatives.length} initiatives completed — docs enabled`,
    };
  }

  return {
    active: false,
    reason: `Need ${MIN_COMPLETED_INITIATIVES}+ completed initiatives (current: ${completedInitiatives.length})`,
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
      case "security":
        return checkSecurityActivation();
      case "architect":
        return checkArchitectActivation(ctx, args.organizationId);
      case "growth":
        return checkGrowthActivation(ctx, args.organizationId);
      case "sales":
        return checkSalesActivation(ctx, args.organizationId);
      case "support":
        return checkSupportActivation(ctx, args.organizationId);
      case "docs":
        return checkDocsActivation(ctx, args.organizationId);
      default:
        return { active: true, reason: "Core agent — always active" };
    }
  },
});
