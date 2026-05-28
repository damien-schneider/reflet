import { evaluateHarnessGuards } from "@reflet/harness";
import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../../_generated/server";
import {
  activityLogLevel,
  bridgeDoctorCheck,
  harnessArtifactKind,
  harnessValidationStatus,
} from "../schema/validators";
import { readHarnessGuardState } from "./guards";

const bridgeJobReturn = v.object({
  id: v.id("autopilotBridgeJobs"),
  recipeId: v.string(),
  recipeVersion: v.number(),
  title: v.string(),
  worktreeBranch: v.string(),
});

const artifactInput = v.object({
  artifactKind: harnessArtifactKind,
  downstreamInvalidations: v.array(v.string()),
  evidenceHashes: v.record(v.string(), v.string()),
  inputArtifactHashes: v.record(v.string(), v.string()),
  outputHash: v.string(),
  path: v.string(),
  promptHash: v.string(),
  recipeId: v.string(),
  recipeVersion: v.number(),
  title: v.string(),
  validationScore: v.number(),
  validationStatus: harnessValidationStatus,
  validatorMessages: v.array(v.string()),
});

type ArtifactInput = typeof artifactInput.type;

function buildBranch(recipeId: string, jobId: string): string {
  return `reflet/${recipeId}/${jobId}`;
}

async function assertJob(
  ctx: { db: MutationCtx["db"] },
  jobId: Id<"autopilotBridgeJobs">
): Promise<Doc<"autopilotBridgeJobs">> {
  const job = await ctx.db.get(jobId);
  if (!job) {
    throw new Error("Bridge job not found");
  }
  return job;
}

async function upsertArtifact(
  ctx: { db: MutationCtx["db"] },
  args: {
    artifact: ArtifactInput;
    organizationId: Id<"organizations">;
    repoFullName: string;
  }
): Promise<void> {
  if (args.artifact.path.startsWith(".reflet/users")) {
    throw new Error("Private user data folder is not allowed in .reflet");
  }
  const now = Date.now();
  const existing = await ctx.db
    .query("refletArtifacts")
    .withIndex("by_org_path", (q) =>
      q.eq("organizationId", args.organizationId).eq("path", args.artifact.path)
    )
    .unique();
  const patch = {
    artifactKind: args.artifact.artifactKind,
    downstreamInvalidations: args.artifact.downstreamInvalidations,
    evidenceHashes: args.artifact.evidenceHashes,
    inputArtifactHashes: args.artifact.inputArtifactHashes,
    outputHash: args.artifact.outputHash,
    path: args.artifact.path,
    promptHash: args.artifact.promptHash,
    recipeId: args.artifact.recipeId,
    recipeVersion: args.artifact.recipeVersion,
    title: args.artifact.title,
    validationScore: args.artifact.validationScore,
    validationStatus: args.artifact.validationStatus,
    validatorMessages: args.artifact.validatorMessages,
    updatedAt: now,
  };
  if (existing) {
    await ctx.db.patch(existing._id, patch);
    return;
  }
  await ctx.db.insert("refletArtifacts", {
    createdAt: now,
    organizationId: args.organizationId,
    repoFullName: args.repoFullName,
    ...patch,
  });
}

async function bridgeClaimAllowed(
  ctx: { db: MutationCtx["db"] },
  bridge: Doc<"autopilotBridgeInstallations">
): Promise<boolean> {
  const guard = evaluateHarnessGuards(
    await readHarnessGuardState(ctx, {
      organizationId: bridge.organizationId,
      repoFullName: bridge.repoFullName,
      worktreeClean: true,
      bridgeOnline: bridge.status === "online",
      claudeAvailable: bridge.claudeAvailable,
    })
  );
  return guard.allowed;
}

export const upsertBridgeForRepo = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    repoFullName: v.string(),
    bridgeName: v.string(),
    claudeAvailable: v.boolean(),
    doctorChecks: v.array(bridgeDoctorCheck),
  },
  returns: v.id("autopilotBridgeInstallations"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const status: "blocked" | "online" = args.claudeAvailable
      ? "online"
      : "blocked";
    const existing = await ctx.db
      .query("autopilotBridgeInstallations")
      .withIndex("by_org_repo", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("repoFullName", args.repoFullName)
      )
      .unique();
    const patch = {
      bridgeName: args.bridgeName,
      claudeAvailable: args.claudeAvailable,
      doctorChecks: args.doctorChecks,
      lastHeartbeatAt: now,
      status,
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("autopilotBridgeInstallations", {
      createdAt: now,
      organizationId: args.organizationId,
      repoFullName: args.repoFullName,
      ...patch,
    });
  },
});

export const heartbeatBridgeForRepo = internalMutation({
  args: {
    bridgeInstallationId: v.id("autopilotBridgeInstallations"),
    organizationId: v.id("organizations"),
    repoFullName: v.string(),
    bridgeName: v.string(),
    claudeAvailable: v.boolean(),
    doctorChecks: v.array(bridgeDoctorCheck),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const status: "blocked" | "online" = args.claudeAvailable
      ? "online"
      : "blocked";
    const bridge = await ctx.db.get(args.bridgeInstallationId);
    if (
      !bridge ||
      bridge.organizationId !== args.organizationId ||
      bridge.repoFullName !== args.repoFullName
    ) {
      throw new Error("Bridge installation not found");
    }
    await ctx.db.patch(args.bridgeInstallationId, {
      bridgeName: args.bridgeName,
      claudeAvailable: args.claudeAvailable,
      doctorChecks: args.doctorChecks,
      lastHeartbeatAt: now,
      status,
      updatedAt: now,
    });
    return null;
  },
});

export const claimNextBridgeJobForRepo = internalMutation({
  args: {
    bridgeInstallationId: v.id("autopilotBridgeInstallations"),
    organizationId: v.id("organizations"),
    repoFullName: v.string(),
  },
  returns: v.union(v.null(), bridgeJobReturn),
  handler: async (ctx, args) => {
    const bridge = await ctx.db.get(args.bridgeInstallationId);
    if (
      !bridge ||
      bridge.status !== "online" ||
      !bridge.claudeAvailable ||
      bridge.organizationId !== args.organizationId ||
      bridge.repoFullName !== args.repoFullName
    ) {
      return null;
    }
    if (!(await bridgeClaimAllowed(ctx, bridge))) {
      return null;
    }
    const queued = await ctx.db
      .query("autopilotBridgeJobs")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", bridge.organizationId).eq("status", "queued")
      )
      .collect();
    const job = queued.find(
      (candidate) => candidate.repoFullName === args.repoFullName
    );
    if (!job) {
      return null;
    }
    const worktreeBranch = buildBranch(job.recipeId, job._id);
    await ctx.db.patch(job._id, {
      bridgeInstallationId: bridge._id,
      claimedAt: Date.now(),
      status: "running",
      updatedAt: Date.now(),
      worktreeBranch,
    });
    return {
      id: job._id,
      recipeId: job.recipeId,
      recipeVersion: job.recipeVersion,
      title: job.title,
      worktreeBranch,
    };
  },
});

export const appendBridgeJobEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    jobId: v.id("autopilotBridgeJobs"),
    level: activityLogLevel,
    message: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await assertJob(ctx, args.jobId);
    if (job.organizationId !== args.organizationId) {
      throw new Error("Bridge job organization mismatch");
    }
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

export const completeBridgeJobRun = internalMutation({
  args: {
    artifacts: v.array(artifactInput),
    claudeSessionId: v.union(v.null(), v.string()),
    commitSha: v.string(),
    jobId: v.id("autopilotBridgeJobs"),
    organizationId: v.id("organizations"),
    prUrl: v.string(),
    promptHash: v.string(),
    runtimeMs: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await assertJob(ctx, args.jobId);
    if (job.organizationId !== args.organizationId) {
      throw new Error("Bridge job organization mismatch");
    }
    await ctx.db.patch(args.jobId, {
      claudeSessionId: args.claudeSessionId ?? undefined,
      commitSha: args.commitSha,
      finishedAt: Date.now(),
      prUrl: args.prUrl,
      promptHash: args.promptHash,
      runtimeMs: args.runtimeMs,
      status: "succeeded",
      updatedAt: Date.now(),
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

export const failBridgeJobRun = internalMutation({
  args: {
    blockerMessage: v.optional(v.string()),
    failureReason: v.string(),
    jobId: v.id("autopilotBridgeJobs"),
    organizationId: v.id("organizations"),
    runtimeMs: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await assertJob(ctx, args.jobId);
    if (job.organizationId !== args.organizationId) {
      throw new Error("Bridge job organization mismatch");
    }
    await ctx.db.patch(args.jobId, {
      blockerMessage: args.blockerMessage,
      failureReason: args.failureReason,
      finishedAt: Date.now(),
      runtimeMs: args.runtimeMs,
      status: "blocked",
      updatedAt: Date.now(),
    });
    return null;
  },
});
