import type { httpRouter } from "convex/server";
import { z } from "zod";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  adminPost,
  corsOptionsHandler,
  parseId,
  requireStr,
  str,
} from "./helpers";

type Router = ReturnType<typeof httpRouter>;

const BRIDGE_API_PATHS = [
  "/api/v1/admin/bridge/register",
  "/api/v1/admin/bridge/heartbeat",
  "/api/v1/admin/bridge/claim",
  "/api/v1/admin/bridge/event",
  "/api/v1/admin/bridge/complete",
  "/api/v1/admin/bridge/fail",
] as const;

const doctorCheckSchema = z.object({
  label: z.string().min(1),
  message: z.string().optional(),
  passed: z.boolean(),
});

const artifactSchema = z.object({
  artifactKind: z.enum([
    "product_brain",
    "codebase_map",
    "market_map",
    "audience_research",
    "use_case_map",
    "product_gap_analysis",
    "posthog_audit",
    "bug_report",
    "task_plan",
    "pull_request_draft",
    "pull_request_review",
    "changelog",
    "growth_draft",
    "community_drafts",
  ]),
  content: z.string().optional(),
  structuredOutput: z.unknown().optional(),
  downstreamInvalidations: z.array(z.string()),
  evidenceHashes: z.record(z.string(), z.string()),
  inputArtifactHashes: z.record(z.string(), z.string()),
  outputHash: z.string().min(1),
  path: z
    .string()
    .min(1)
    .refine((path) => !path.startsWith(".reflet/users"), {
      message: ".reflet/users is reserved and cannot contain bridge artifacts",
    }),
  promptHash: z.string().min(1),
  recipeId: z.string().min(1),
  recipeVersion: z.number().int().positive(),
  title: z.string().min(1),
  validationScore: z.number().min(0).max(100),
  validationStatus: z.enum(["passed", "warning", "failed"]),
  validatorMessages: z.array(z.string()),
});

const documentInputSchema = z.object({
  content: z.string().min(1),
  platform: z.string().min(1).optional(),
  targetUrl: z.string().min(1).optional(),
  title: z.string().min(1),
  type: z.enum([
    "blog_post",
    "market_research",
    "note",
    "email",
    "support_thread",
    "battlecard",
    "changelog",
    "reddit_reply",
    "linkedin_post",
    "twitter_post",
    "hn_comment",
    "adr",
    "prospect_brief",
    "codebase_understanding",
    "app_description",
    "target_definition",
    "persona_brief",
  ]),
});

const registrationSchema = z.object({
  bridgeName: z.string().min(1),
  claudeAvailable: z.boolean(),
  doctorChecks: z.array(doctorCheckSchema).min(1),
  repoFullName: z.string().min(1),
});

const claimSchema = z.object({
  bridgeInstallationId: z.string().min(1),
  repoFullName: z.string().min(1),
});

const eventSchema = z.object({
  jobId: z.string().min(1),
  level: z.enum(["info", "action", "success", "warning", "error"]),
  message: z.string().min(1),
});

const completeSchema = z.object({
  artifacts: z.array(artifactSchema),
  claudeSessionId: z.union([z.string().min(1), z.null()]),
  commitSha: z.string().min(1),
  documents: z.array(documentInputSchema).optional(),
  jobId: z.string().min(1),
  prUrl: z.string().optional(),
  promptHash: z.string().min(1),
  runtimeMs: z.number().nonnegative(),
});

const failSchema = z.object({
  blockerMessage: z.string().optional(),
  failureReason: z.string().min(1),
  jobId: z.string().min(1),
  runtimeMs: z.number().nonnegative(),
});

function bridgeId(value: string): Id<"autopilotBridgeInstallations"> {
  return parseId(value, "bridgeInstallationId");
}

function jobId(value: string): Id<"autopilotBridgeJobs"> {
  return parseId(value, "jobId");
}

export function parseBridgeRegistrationInput(body: unknown) {
  return registrationSchema.parse(body);
}

export function registerBridgeApiRoutes(http: Router): void {
  http.route({
    path: "/api/v1/admin/bridge/register",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) => {
      const input = parseBridgeRegistrationInput(body);
      const bridgeInstallationId = await ctx.runMutation(
        internal.autopilot.harness.bridge.upsertBridgeForRepo,
        { organizationId, ...input }
      );
      return { bridgeInstallationId };
    }),
  });

  http.route({
    path: "/api/v1/admin/bridge/heartbeat",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) => {
      const input = registrationSchema
        .extend({
          bridgeInstallationId: z.string().min(1),
        })
        .parse(body);
      await ctx.runMutation(
        internal.autopilot.harness.bridge.heartbeatBridgeForRepo,
        {
          organizationId,
          bridgeInstallationId: bridgeId(input.bridgeInstallationId),
          bridgeName: input.bridgeName,
          claudeAvailable: input.claudeAvailable,
          doctorChecks: input.doctorChecks,
          repoFullName: input.repoFullName,
        }
      );
      return { success: true };
    }),
  });

  http.route({
    path: "/api/v1/admin/bridge/claim",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) => {
      const input = claimSchema.parse(body);
      const job = await ctx.runMutation(
        internal.autopilot.harness.bridge.claimNextBridgeJobForRepo,
        {
          bridgeInstallationId: bridgeId(input.bridgeInstallationId),
          organizationId,
          repoFullName: input.repoFullName,
        }
      );
      return { job };
    }),
  });

  http.route({
    path: "/api/v1/admin/bridge/event",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) => {
      const input = eventSchema.parse(body);
      await ctx.runMutation(
        internal.autopilot.harness.bridge.appendBridgeJobEvent,
        {
          organizationId,
          jobId: jobId(input.jobId),
          level: input.level,
          message: input.message,
        }
      );
      return { success: true };
    }),
  });

  http.route({
    path: "/api/v1/admin/bridge/complete",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) => {
      const input = completeSchema.parse(body);
      await ctx.runMutation(
        internal.autopilot.harness.bridge.completeBridgeJobRun,
        { ...input, jobId: jobId(input.jobId), organizationId }
      );
      return { success: true };
    }),
  });

  http.route({
    path: "/api/v1/admin/bridge/fail",
    method: "POST",
    handler: adminPost(async (ctx, { organizationId }, body) => {
      const input = failSchema.parse(body);
      await ctx.runMutation(
        internal.autopilot.harness.bridge.failBridgeJobRun,
        {
          blockerMessage: str(input.blockerMessage),
          failureReason: requireStr(input.failureReason, "failureReason"),
          jobId: jobId(input.jobId),
          organizationId,
          runtimeMs: input.runtimeMs,
        }
      );
      return { success: true };
    }),
  });

  for (const path of BRIDGE_API_PATHS) {
    http.route({ path, method: "OPTIONS", handler: corsOptionsHandler() });
  }
}
