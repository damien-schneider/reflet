import { DEFAULT_HARNESS_RECIPES } from "@reflet/harness";
import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { internalQuery, type QueryCtx, query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgMembership } from "../queries/auth";
import {
  activityLogLevel,
  bridgeInstallationStatus,
  bridgeJobStatus,
  harnessArtifactKind,
  harnessValidationStatus,
} from "../schema/validators";

const recipeView = v.object({
  id: v.string(),
  title: v.string(),
  version: v.number(),
  productMapTopic: v.string(),
  productMapLifecycle: v.string(),
  dependsOn: v.array(v.string()),
  subagents: v.array(v.string()),
  outputs: v.array(v.object({ artifactKind: v.string(), path: v.string() })),
  validations: v.array(v.string()),
});

const overviewValidator = v.object({
  bridge: v.union(
    v.null(),
    v.object({
      id: v.id("autopilotBridgeInstallations"),
      name: v.string(),
      repoFullName: v.string(),
      status: bridgeInstallationStatus,
      claudeAvailable: v.boolean(),
      doctorChecks: v.array(
        v.object({
          label: v.string(),
          message: v.optional(v.string()),
          passed: v.boolean(),
        })
      ),
      lastHeartbeatAt: v.number(),
    })
  ),
  recipes: v.array(recipeView),
  jobs: v.array(
    v.object({
      id: v.id("autopilotBridgeJobs"),
      recipeId: v.string(),
      status: bridgeJobStatus,
      title: v.string(),
      blockerMessage: v.union(v.null(), v.string()),
      commitSha: v.union(v.null(), v.string()),
      worktreeBranch: v.union(v.null(), v.string()),
      prUrl: v.union(v.null(), v.string()),
      runtimeMs: v.union(v.null(), v.number()),
      updatedAt: v.number(),
    })
  ),
  artifacts: v.array(
    v.object({
      id: v.id("refletArtifacts"),
      artifactKind: harnessArtifactKind,
      evidenceHashes: v.record(v.string(), v.string()),
      inputArtifactHashes: v.record(v.string(), v.string()),
      path: v.string(),
      promptHash: v.string(),
      recipeId: v.string(),
      title: v.string(),
      validationScore: v.number(),
      validationStatus: harnessValidationStatus,
      validatorMessages: v.array(v.string()),
      updatedAt: v.number(),
    })
  ),
  events: v.array(
    v.object({
      id: v.id("autopilotBridgeRunEvents"),
      level: activityLogLevel,
      message: v.string(),
      createdAt: v.number(),
    })
  ),
});

const recipes = DEFAULT_HARNESS_RECIPES.map((recipe) => ({
  id: recipe.id,
  title: recipe.title,
  version: recipe.version,
  productMapTopic: recipe.productMapTopic,
  productMapLifecycle: recipe.productMapLifecycle,
  dependsOn: [...recipe.dependsOn],
  subagents: [...recipe.subagents],
  outputs: recipe.outputs.map((output) => ({
    artifactKind: output.artifactKind,
    path: output.path,
  })),
  validations: [...recipe.validations],
}));

async function buildHarnessOverview(
  ctx: { db: QueryCtx["db"] },
  organizationId: Id<"organizations">
) {
  const bridge = await ctx.db
    .query("autopilotBridgeInstallations")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .order("desc")
    .first();
  const jobs = await ctx.db
    .query("autopilotBridgeJobs")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .order("desc")
    .take(12);
  const artifacts = await ctx.db
    .query("refletArtifacts")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .order("desc")
    .take(24);
  const events = await ctx.db
    .query("autopilotBridgeRunEvents")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .order("desc")
    .take(20);

  return {
    bridge: bridge
      ? {
          id: bridge._id,
          name: bridge.bridgeName,
          repoFullName: bridge.repoFullName,
          status: bridge.status,
          claudeAvailable: bridge.claudeAvailable,
          doctorChecks: bridge.doctorChecks ?? [],
          lastHeartbeatAt: bridge.lastHeartbeatAt,
        }
      : null,
    recipes,
    jobs: jobs.map((job) => ({
      id: job._id,
      recipeId: job.recipeId,
      status: job.status,
      title: job.title,
      blockerMessage: job.blockerMessage ?? null,
      commitSha: job.commitSha ?? null,
      worktreeBranch: job.worktreeBranch ?? null,
      prUrl: job.prUrl ?? null,
      runtimeMs: job.runtimeMs ?? null,
      updatedAt: job.updatedAt,
    })),
    artifacts: artifacts.map((artifact) => ({
      id: artifact._id,
      artifactKind: artifact.artifactKind,
      evidenceHashes: artifact.evidenceHashes,
      inputArtifactHashes: artifact.inputArtifactHashes,
      path: artifact.path,
      promptHash: artifact.promptHash,
      recipeId: artifact.recipeId,
      title: artifact.title,
      validationScore: artifact.validationScore,
      validationStatus: artifact.validationStatus,
      validatorMessages: artifact.validatorMessages,
      updatedAt: artifact.updatedAt,
    })),
    events: events.map((event) => ({
      id: event._id,
      level: event.level,
      message: event.message,
      createdAt: event.createdAt,
    })),
  };
}

export const getHarnessOverviewInternal = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: overviewValidator,
  handler: async (ctx, args) =>
    await buildHarnessOverview(ctx, args.organizationId),
});

export const getHarnessOverview = query({
  args: { organizationId: v.id("organizations") },
  returns: overviewValidator,
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgMembership(ctx, args.organizationId, user._id);
    return await buildHarnessOverview(ctx, args.organizationId);
  },
});
