import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { CHAIN_NODE_LABELS, CHAIN_NODE_OWNERS } from "../chain";
import { requireAutopilotAccess, requireOrgAdmin } from "../mutations/auth";
import { chainNodeKind } from "../schema/validators";

const toRoleSkill = (owner: string) => {
  if (
    owner === "cto" ||
    owner === "pm" ||
    owner === "growth" ||
    owner === "sales" ||
    owner === "support" ||
    owner === "validator" ||
    owner === "ceo"
  ) {
    return owner;
  }
  return "ceo";
};

export const retryExecution = mutation({
  args: { executionId: v.id("autopilotExecutions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const execution = await ctx.db.get(args.executionId);
    if (!execution) {
      throw new Error("Execution not found");
    }
    await requireOrgAdmin(ctx, execution.organizationId, user._id);
    await requireAutopilotAccess(ctx, execution.organizationId);
    if (execution.status !== "failed" && execution.status !== "blocked") {
      return null;
    }
    await ctx.db.patch(args.executionId, {
      status: "queued",
      triggerReason: "failed_execution_retry",
      errorMessage: undefined,
      blockerKind: undefined,
      blockerMessage: undefined,
      nextRetryAt: undefined,
      queuedAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(
      0,
      internal.autopilot.runtime.lifecycle.runExecutionFromRecord,
      { executionId: args.executionId }
    );
    return null;
  },
});

export const refreshDeliverable = mutation({
  args: {
    organizationId: v.id("organizations"),
    node: chainNodeKind,
  },
  returns: v.id("autopilotExecutions"),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);
    await requireAutopilotAccess(ctx, args.organizationId);

    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();
    const now = Date.now();
    const executionId = await ctx.db.insert("autopilotExecutions", {
      organizationId: args.organizationId,
      role: toRoleSkill(CHAIN_NODE_OWNERS[args.node]),
      status: config?.autonomyMode === "stopped" ? "blocked" : "queued",
      triggerReason: "manual_refresh",
      actionKind: "refresh_deliverable",
      title: `Refresh ${CHAIN_NODE_LABELS[args.node]}`,
      chainNode: args.node,
      blockerKind:
        config?.autonomyMode === "stopped" ? "autopilot_stopped" : undefined,
      blockerMessage:
        config?.autonomyMode === "stopped"
          ? "Autopilot is stopped. The stale state is visible, but generation is disabled."
          : undefined,
      retryCount: 0,
      maxRetries: 2,
      queuedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    if (config?.autonomyMode !== "stopped") {
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.runtime.lifecycle.runExecutionFromRecord,
        { executionId }
      );
    }
    return executionId;
  },
});
