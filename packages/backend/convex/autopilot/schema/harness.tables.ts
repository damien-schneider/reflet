import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  activityLogLevel,
  bridgeDoctorCheck,
  bridgeInstallationStatus,
  bridgeJobStatus,
  harnessArtifactKind,
  harnessValidationStatus,
} from "./validators";

export const harnessTables = {
  autopilotBridgeInstallations: defineTable({
    organizationId: v.id("organizations"),
    repoFullName: v.string(),
    bridgeName: v.string(),
    status: bridgeInstallationStatus,
    claudeAvailable: v.boolean(),
    doctorChecks: v.optional(v.array(bridgeDoctorCheck)),
    lastHeartbeatAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_repo", ["organizationId", "repoFullName"])
    .index("by_org_status", ["organizationId", "status"]),

  autopilotBridgeJobs: defineTable({
    organizationId: v.id("organizations"),
    repoFullName: v.string(),
    bridgeInstallationId: v.optional(v.id("autopilotBridgeInstallations")),
    recipeId: v.string(),
    recipeVersion: v.number(),
    title: v.string(),
    status: bridgeJobStatus,
    worktreeBranch: v.optional(v.string()),
    prUrl: v.optional(v.string()),
    promptHash: v.optional(v.string()),
    commitSha: v.optional(v.string()),
    claudeSessionId: v.optional(v.string()),
    runtimeMs: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    blockerMessage: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    claimedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_installation_status", ["bridgeInstallationId", "status"])
    .index("by_org_recipe", ["organizationId", "recipeId"]),

  autopilotBridgeRunEvents: defineTable({
    organizationId: v.id("organizations"),
    jobId: v.id("autopilotBridgeJobs"),
    level: activityLogLevel,
    message: v.string(),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_job_created", ["jobId", "createdAt"]),

  refletArtifacts: defineTable({
    organizationId: v.id("organizations"),
    repoFullName: v.string(),
    path: v.string(),
    artifactKind: harnessArtifactKind,
    title: v.string(),
    recipeId: v.string(),
    recipeVersion: v.number(),
    promptHash: v.string(),
    inputArtifactHashes: v.record(v.string(), v.string()),
    evidenceHashes: v.record(v.string(), v.string()),
    outputHash: v.string(),
    validationStatus: harnessValidationStatus,
    validationScore: v.number(),
    validatorMessages: v.array(v.string()),
    downstreamInvalidations: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_org_path", ["organizationId", "path"])
    .index("by_org_recipe", ["organizationId", "recipeId"]),
};
