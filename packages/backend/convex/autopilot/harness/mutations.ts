import { evaluateHarnessGuards } from "@reflet/harness";
import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import {
  internalMutation,
  type MutationCtx,
  mutation,
} from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireAutopilotAccess, requireOrgAdmin } from "../mutations/auth";
import {
  activityLogLevel,
  harnessArtifactKind,
  harnessValidationStatus,
} from "../schema/validators";

const artifactInput = v.object({
  downstreamInvalidations: v.optional(v.array(v.string())),
  evidenceHashes: v.optional(v.record(v.string(), v.string())),
  artifactKind: harnessArtifactKind,
  inputArtifactHashes: v.optional(v.record(v.string(), v.string())),
  outputHash: v.string(),
  path: v.string(),
  promptHash: v.optional(v.string()),
  recipeId: v.string(),
  recipeVersion: v.number(),
  title: v.string(),
  validationScore: v.number(),
  validationStatus: harnessValidationStatus,
  validatorMessages: v.optional(v.array(v.string())),
});

const bridgeJobValidator = v.object({
  _id: v.id("autopilotBridgeJobs"),
  _creationTime: v.number(),
  organizationId: v.id("organizations"),
  repoFullName: v.string(),
  bridgeInstallationId: v.optional(v.id("autopilotBridgeInstallations")),
  recipeId: v.string(),
  recipeVersion: v.number(),
  title: v.string(),
  status: v.literal("running"),
  worktreeBranch: v.string(),
  prUrl: v.optional(v.string()),
  errorMessage: v.optional(v.string()),
  blockerMessage: v.optional(v.string()),
  claimedAt: v.number(),
  finishedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

interface ArtifactInput {
  artifactKind: Doc<"refletArtifacts">["artifactKind"];
  downstreamInvalidations?: string[];
  evidenceHashes?: Record<string, string>;
  inputArtifactHashes?: Record<string, string>;
  outputHash: string;
  path: string;
  promptHash?: string;
  recipeId: string;
  recipeVersion: number;
  title: string;
  validationScore: number;
  validationStatus: Doc<"refletArtifacts">["validationStatus"];
  validatorMessages?: string[];
}

const buildBranch = (recipeId: string, jobId: string): string =>
  `reflet/${recipeId}/${jobId}`;

async function countPendingApprovals(
  ctx: { db: MutationCtx["db"] },
  organizationId: Id<"organizations">
): Promise<number> {
  const [documents, workItems] = await Promise.all([
    ctx.db
      .query("autopilotDocuments")
      .withIndex("by_org_review", (q) =>
        q.eq("organizationId", organizationId).eq("needsReview", true)
      )
      .collect(),
    ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_review", (q) =>
        q.eq("organizationId", organizationId).eq("needsReview", true)
      )
      .collect(),
  ]);
  return documents.length + workItems.length;
}

async function countOpenRefletPrs(
  ctx: { db: MutationCtx["db"] },
  organizationId: Id<"organizations">
): Promise<number> {
  const jobs = await ctx.db
    .query("autopilotBridgeJobs")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .collect();
  return jobs.filter((job) => Boolean(job.prUrl) && job.status === "succeeded")
    .length;
}

async function getLatestBridge(
  ctx: { db: MutationCtx["db"] },
  organizationId: Id<"organizations">,
  repoFullName: string
): Promise<Doc<"autopilotBridgeInstallations"> | null> {
  return await ctx.db
    .query("autopilotBridgeInstallations")
    .withIndex("by_org_repo", (q) =>
      q.eq("organizationId", organizationId).eq("repoFullName", repoFullName)
    )
    .order("desc")
    .first();
}

export const upsertBridgeInstallation = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    repoFullName: v.string(),
    bridgeName: v.string(),
    bridgeOnline: v.boolean(),
    claudeAvailable: v.boolean(),
  },
  returns: v.id("autopilotBridgeInstallations"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("autopilotBridgeInstallations")
      .withIndex("by_org_repo", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("repoFullName", args.repoFullName)
      )
      .unique();
    const status = args.bridgeOnline ? "online" : "offline";
    if (existing) {
      await ctx.db.patch(existing._id, {
        bridgeName: args.bridgeName,
        status,
        claudeAvailable: args.claudeAvailable,
        lastHeartbeatAt: now,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("autopilotBridgeInstallations", {
      organizationId: args.organizationId,
      repoFullName: args.repoFullName,
      bridgeName: args.bridgeName,
      status,
      claudeAvailable: args.claudeAvailable,
      lastHeartbeatAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const enqueueBridgeJob = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    repoFullName: v.string(),
    recipeId: v.string(),
    recipeVersion: v.number(),
    title: v.string(),
  },
  returns: v.id("autopilotBridgeJobs"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("autopilotBridgeJobs", {
      organizationId: args.organizationId,
      repoFullName: args.repoFullName,
      recipeId: args.recipeId,
      recipeVersion: args.recipeVersion,
      title: args.title,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const enqueueProductBrain = mutation({
  args: {
    organizationId: v.id("organizations"),
    repoFullName: v.string(),
  },
  returns: v.id("autopilotBridgeJobs"),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);
    await requireAutopilotAccess(ctx, args.organizationId);

    const [bridge, pendingApprovals, openRefletPrs] = await Promise.all([
      getLatestBridge(ctx, args.organizationId, args.repoFullName),
      countPendingApprovals(ctx, args.organizationId),
      countOpenRefletPrs(ctx, args.organizationId),
    ]);
    const guard = evaluateHarnessGuards({
      bridgeOnline: bridge?.status === "online",
      claudeAvailable: bridge?.claudeAvailable ?? false,
      consecutiveNoopRuns: 0,
      consecutiveValidatorFailures: 0,
      openRefletPrs,
      pendingApprovals,
      worktreeClean: true,
    });
    if (!guard.allowed) {
      throw new Error(`Harness blocked: ${guard.reason}`);
    }

    const now = Date.now();
    return await ctx.db.insert("autopilotBridgeJobs", {
      organizationId: args.organizationId,
      repoFullName: args.repoFullName,
      recipeId: "product-brain",
      recipeVersion: 1,
      title: "Build Product Brain",
      status: "queued",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const claimNextBridgeJob = internalMutation({
  args: { bridgeInstallationId: v.id("autopilotBridgeInstallations") },
  returns: v.union(v.null(), bridgeJobValidator),
  handler: async (ctx, args) => {
    const installation = await ctx.db.get(args.bridgeInstallationId);
    if (
      !installation ||
      installation.status !== "online" ||
      !installation.claudeAvailable
    ) {
      return null;
    }
    const job = await ctx.db
      .query("autopilotBridgeJobs")
      .withIndex("by_org_status", (q) =>
        q
          .eq("organizationId", installation.organizationId)
          .eq("status", "queued")
      )
      .first();
    if (!job) {
      return null;
    }
    const runningStatus = "running" as const;
    const worktreeBranch = buildBranch(job.recipeId, job._id);
    const now = Date.now();
    await ctx.db.patch(job._id, {
      bridgeInstallationId: installation._id,
      status: runningStatus,
      worktreeBranch,
      claimedAt: now,
      updatedAt: now,
    });
    return {
      ...job,
      bridgeInstallationId: installation._id,
      status: runningStatus,
      worktreeBranch,
      claimedAt: now,
      updatedAt: now,
    };
  },
});

export const appendBridgeRunEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    jobId: v.id("autopilotBridgeJobs"),
    level: activityLogLevel,
    message: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("autopilotBridgeRunEvents", {
      organizationId: args.organizationId,
      jobId: args.jobId,
      level: args.level,
      message: args.message,
      createdAt: Date.now(),
    });
    return null;
  },
});

async function upsertArtifact(
  ctx: { db: MutationCtx["db"] },
  args: {
    artifact: ArtifactInput;
    organizationId: Id<"organizations">;
    repoFullName: string;
  }
) {
  const now = Date.now();
  const existing = await ctx.db
    .query("refletArtifacts")
    .withIndex("by_org_path", (q) =>
      q.eq("organizationId", args.organizationId).eq("path", args.artifact.path)
    )
    .unique();
  const patch = {
    artifactKind: args.artifact.artifactKind,
    title: args.artifact.title,
    recipeId: args.artifact.recipeId,
    recipeVersion: args.artifact.recipeVersion,
    promptHash: args.artifact.promptHash ?? args.artifact.outputHash,
    inputArtifactHashes: args.artifact.inputArtifactHashes ?? {},
    evidenceHashes: args.artifact.evidenceHashes ?? {},
    outputHash: args.artifact.outputHash,
    validationStatus: args.artifact.validationStatus,
    validationScore: args.artifact.validationScore,
    validatorMessages: args.artifact.validatorMessages ?? [],
    downstreamInvalidations: args.artifact.downstreamInvalidations ?? [],
    updatedAt: now,
  };
  if (existing) {
    await ctx.db.patch(existing._id, patch);
    return;
  }
  await ctx.db.insert("refletArtifacts", {
    organizationId: args.organizationId,
    repoFullName: args.repoFullName,
    path: args.artifact.path,
    createdAt: now,
    ...patch,
  });
}

export const completeBridgeJob = internalMutation({
  args: {
    jobId: v.id("autopilotBridgeJobs"),
    prUrl: v.string(),
    artifacts: v.array(artifactInput),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error("Bridge job not found");
    }
    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      status: "succeeded",
      prUrl: args.prUrl,
      finishedAt: now,
      updatedAt: now,
    });
    for (const artifact of args.artifacts) {
      await upsertArtifact(ctx, {
        artifact,
        organizationId: job.organizationId,
        repoFullName: job.repoFullName,
      });
    }
    return null;
  },
});
