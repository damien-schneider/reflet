/**
 * Shared helpers used by multiple coding adapters.
 */

import { z } from "zod";
import type { ActivityLogEntry, TaskStatusResponse } from "./types";

export const githubIssueResponseSchema = z.object({
  number: z.number(),
  html_url: z.string(),
});

export const githubPullSchema = z.object({
  number: z.number(),
  html_url: z.string(),
  title: z
    .string()
    .nullish()
    .transform((value) => value ?? ""),
  body: z
    .string()
    .nullish()
    .transform((value) => value ?? ""),
  draft: z.boolean().optional().default(false),
  state: z.string().optional().default(""),
  head: z.object({ ref: z.string() }),
});

export const githubPullsResponseSchema = z.array(githubPullSchema);

export const githubPullDetailResponseSchema = githubPullSchema.extend({
  merged: z.boolean().optional().default(false),
});

export const githubCheckRunsResponseSchema = z.object({
  check_runs: z.array(
    z.object({
      status: z.string(),
      conclusion: z.string().nullable(),
      output: z.object({ summary: z.string().optional() }).optional(),
    })
  ),
});

export const githubWorkflowRunsResponseSchema = z.object({
  workflow_runs: z.array(
    z.object({
      name: z.string(),
      status: z.string(),
      conclusion: z.string().nullable(),
    })
  ),
});

export const githubCommentsResponseSchema = z.array(
  z.object({
    user: z.object({ login: z.string() }),
    body: z.string(),
    created_at: z.string(),
  })
);

export const githubContentFileResponseSchema = z.object({
  content: z.string(),
  sha: z.string(),
});

export const githubDirectoryResponseSchema = z.array(
  z.object({
    name: z.string(),
    path: z.string(),
    type: z.string(),
  })
);

export const githubCodeSearchResponseSchema = z.object({
  items: z.array(
    z.object({
      path: z.string(),
      text_matches: z.array(z.object({ fragment: z.string() })).optional(),
    })
  ),
});

export const githubRefResponseSchema = z.object({
  object: z.object({ sha: z.string() }),
});

type GitHubCheckRun = z.infer<
  typeof githubCheckRunsResponseSchema
>["check_runs"][number];

export const parseGitHubCheckRuns = (
  checkRuns: GitHubCheckRun[]
): {
  ciFailureLog?: string;
  ciStatus: "pending" | "running" | "passed" | "failed";
} => {
  if (checkRuns.length === 0) {
    return { ciStatus: "pending" };
  }

  const failedRun = checkRuns.find(
    (run) =>
      run.conclusion === "failure" ||
      run.conclusion === "cancelled" ||
      run.conclusion === "timed_out"
  );
  if (failedRun) {
    return {
      ciStatus: "failed",
      ciFailureLog: failedRun.output?.summary?.slice(0, 2000),
    };
  }

  const hasRunning = checkRuns.some((run) => run.status !== "completed");
  return { ciStatus: hasRunning ? "running" : "passed" };
};

export const isPullRequestLinkedToIssue = (
  pull: z.infer<typeof githubPullSchema>,
  issueNumber: string
): boolean => {
  const issueRef = new RegExp(`(^|[^\\d])#${issueNumber}(?!\\d)`);
  const issueUrl = new RegExp(`/issues/${issueNumber}(?:\\D|$)`);
  return (
    issueRef.test(pull.body) ||
    issueRef.test(pull.title) ||
    issueUrl.test(pull.body)
  );
};

export const log = (
  agent: ActivityLogEntry["agent"],
  level: ActivityLogEntry["level"],
  message: string,
  details?: string
): ActivityLogEntry => ({
  agent,
  level,
  message,
  details,
  timestamp: Date.now(),
});

export const createProviderStatusFailure = async (
  adapterName: string,
  response: Response,
  existingLogs: ActivityLogEntry[] = []
): Promise<TaskStatusResponse> => {
  const details = (await response.text()).slice(0, 500);
  return {
    status: "running",
    activityLogs: [
      ...existingLogs,
      log(
        "system",
        "warning",
        `Could not check PR status for ${adapterName}: ${response.status}`,
        details || response.statusText
      ),
    ],
    tokensUsed: 0,
    estimatedCostUsd: 0,
  };
};

export const createProviderParseFailure = (
  adapterName: string,
  resourceName: string,
  error: unknown,
  existingLogs: ActivityLogEntry[] = []
): TaskStatusResponse => {
  const details =
    error instanceof Error ? error.message : "Unknown parse error";
  return {
    status: "running",
    activityLogs: [
      ...existingLogs,
      log(
        "system",
        "warning",
        `Could not parse ${resourceName} response for ${adapterName}`,
        details
      ),
    ],
    tokensUsed: 0,
    estimatedCostUsd: 0,
  };
};

export const parseResponseJson = async <Output>(
  response: Response,
  schema: z.ZodType<Output>,
  resourceName: string
): Promise<Output> => {
  const parsed = schema.safeParse(await response.json());
  if (parsed.success) {
    return parsed.data;
  }

  const issue = parsed.error.issues[0];
  const path = issue?.path.length ? ` at ${issue.path.join(".")}` : "";
  throw new Error(`Invalid ${resourceName} response${path}`);
};
