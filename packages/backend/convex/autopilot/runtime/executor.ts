import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import type { ChainNodeKind } from "../chain";

type RuntimeActionCtx = Pick<
  ActionCtx,
  "runAction" | "runMutation" | "runQuery"
>;

const runChainProducer = async (
  ctx: RuntimeActionCtx,
  organizationId: Id<"organizations">,
  node: ChainNodeKind
) => {
  if (node === "codebase_understanding") {
    await ctx.runAction(
      internal.autopilot.role_skills.chain_producers
        .produceCodebaseUnderstanding,
      { organizationId }
    );
    return;
  }
  if (node === "product_profile") {
    await ctx.runAction(
      internal.autopilot.role_skills.chain_producers.produceProductProfile,
      { organizationId }
    );
    return;
  }
  if (node === "brand_voice") {
    await ctx.runAction(
      internal.autopilot.role_skills.chain_producers.produceBrandVoice,
      { organizationId }
    );
    return;
  }
  await runRemainingChainProducer(ctx, organizationId, node);
};

const runRemainingChainProducer = async (
  ctx: RuntimeActionCtx,
  organizationId: Id<"organizations">,
  node: ChainNodeKind
) => {
  if (node === "feature_catalog") {
    await ctx.runAction(
      internal.autopilot.role_skills.chain_producers.produceFeatureCatalog,
      { organizationId }
    );
    return;
  }
  if (node === "scope") {
    await ctx.runAction(
      internal.autopilot.role_skills.chain_producers.produceScope,
      {
        organizationId,
      }
    );
    return;
  }
  if (node === "market_analysis") {
    await ctx.runAction(
      internal.autopilot.role_skills.chain_producers.produceMarketAnalysis,
      { organizationId }
    );
    return;
  }
  await runLeafChainProducer(ctx, organizationId, node);
};

const runLeafChainProducer = async (
  ctx: RuntimeActionCtx,
  organizationId: Id<"organizations">,
  node: ChainNodeKind
) => {
  if (node === "target_definition") {
    await ctx.runAction(
      internal.autopilot.role_skills.chain_producers.produceTargetDefinition,
      { organizationId }
    );
    return;
  }
  if (node === "personas") {
    await ctx.runAction(
      internal.autopilot.role_skills.chain_producers.producePersonas,
      { organizationId }
    );
    return;
  }
  if (node === "use_cases") {
    await ctx.runAction(
      internal.autopilot.role_skills.chain_producers.produceUseCases,
      { organizationId }
    );
    return;
  }
  await runDiscoveryChainProducer(ctx, organizationId, node);
};

const runDiscoveryChainProducer = async (
  ctx: RuntimeActionCtx,
  organizationId: Id<"organizations">,
  node: ChainNodeKind
) => {
  if (node === "community_posts") {
    await ctx.runAction(
      internal.autopilot.role_skills.community_discovery.runCommunityDiscovery,
      { organizationId }
    );
    return;
  }
  if (node === "drafts") {
    await ctx.runAction(
      internal.autopilot.role_skills.growth.drafts.producer
        .runCommunityDraftGeneration,
      { organizationId }
    );
    return;
  }
  await ctx.runAction(
    internal.autopilot.role_skills.sales_prospecting.runSalesProspecting,
    { organizationId }
  );
};

const markBlocked = async (
  ctx: RuntimeActionCtx,
  execution: Doc<"autopilotExecutions">,
  blockerKind: string,
  blockerMessage: string
) => {
  await ctx.runMutation(internal.autopilot.runtime.lifecycle.markBlocked, {
    executionId: execution._id,
    blockerKind,
    blockerMessage,
  });
};

const executeTask = async (
  ctx: RuntimeActionCtx,
  execution: Doc<"autopilotExecutions">
) => {
  if (!execution.workItemId) {
    await markBlocked(
      ctx,
      execution,
      "missing_work_item",
      "Task execution is missing a work item id."
    );
    return;
  }
  const checkedOut = await ctx.runMutation(
    internal.autopilot.execution_lifecycle.checkoutTask,
    { taskId: execution.workItemId, role: execution.role }
  );
  if (!checkedOut) {
    await markBlocked(
      ctx,
      execution,
      "task_not_available",
      "Task is no longer available for dispatch."
    );
    return;
  }
  await runTaskRoleSkill(ctx, execution, execution.workItemId);
};

const runTaskRoleSkill = async (
  ctx: RuntimeActionCtx,
  execution: Doc<"autopilotExecutions">,
  taskId: Id<"autopilotWorkItems">
) => {
  if (execution.role === "cto") {
    await ctx.runAction(
      internal.autopilot.role_skills.cto.runCTOSpecGeneration,
      {
        organizationId: execution.organizationId,
        taskId,
      }
    );
    return;
  }
  if (execution.role === "growth") {
    await ctx.runAction(
      internal.autopilot.role_skills.growth.market_research
        .runGrowthMarketResearch,
      { organizationId: execution.organizationId, taskId }
    );
    return;
  }
  if (execution.role === "sales") {
    await ctx.runAction(
      internal.autopilot.role_skills.sales_prospecting.runSalesProspecting,
      { organizationId: execution.organizationId, taskId }
    );
    return;
  }
  if (execution.role === "support") {
    await ctx.runAction(
      internal.autopilot.role_skills.support.runSupportTriage,
      {
        organizationId: execution.organizationId,
        taskId,
      }
    );
    return;
  }
  await markBlocked(
    ctx,
    execution,
    "unsupported_role",
    `${execution.role} cannot dispatch tasks.`
  );
};

const executeValidationPass = async (
  ctx: RuntimeActionCtx,
  execution: Doc<"autopilotExecutions">
) => {
  await ctx.runAction(
    internal.autopilot.role_skills.validator.runValidatorPass,
    {
      organizationId: execution.organizationId,
    }
  );
  await ctx.runAction(
    internal.autopilot.role_skills.validation.community_posts
      .runCommunityPostValidatorPass,
    { organizationId: execution.organizationId }
  );
};

export const executeRuntimeAction = async (
  ctx: RuntimeActionCtx,
  execution: Doc<"autopilotExecutions">
) => {
  if (
    execution.actionKind === "chain_producer" ||
    execution.actionKind === "refresh_deliverable"
  ) {
    if (!execution.chainNode) {
      await markBlocked(
        ctx,
        execution,
        "missing_chain_node",
        "Chain execution is missing a deliverable node."
      );
      return;
    }
    await runChainProducer(ctx, execution.organizationId, execution.chainNode);
    return;
  }
  if (execution.actionKind === "task_dispatch") {
    await executeTask(ctx, execution);
    return;
  }
  if (execution.actionKind === "validation_pass") {
    await executeValidationPass(ctx, execution);
    return;
  }
  if (execution.actionKind === "support_triage") {
    await ctx.runAction(
      internal.autopilot.role_skills.support.runSupportTriage,
      {
        organizationId: execution.organizationId,
      }
    );
    return;
  }
  if (execution.actionKind === "ceo_coordination") {
    await ctx.runAction(
      internal.autopilot.role_skills.ceo.coordination.runCEOCoordination,
      { organizationId: execution.organizationId }
    );
    return;
  }
  await ctx.runAction(
    internal.autopilot.role_skills.growth.content_generation
      .runGrowthGeneration,
    { organizationId: execution.organizationId, triggerReason: "scheduled" }
  );
};
