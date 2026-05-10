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
  head: z.object({ ref: z.string(), sha: z.string() }),
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

const failedGitHubCheckConclusions = new Set([
  "action_required",
  "cancelled",
  "failure",
  "startup_failure",
  "stale",
  "timed_out",
]);

export const parseGitHubCheckRuns = (
  checkRuns: GitHubCheckRun[]
): {
  ciFailureLog?: string;
  ciStatus: "pending" | "running" | "passed" | "failed";
} => {
  if (checkRuns.length === 0) {
    return { ciStatus: "passed" };
  }

  const failedRun = checkRuns.find(
    (run) =>
      run.conclusion !== null &&
      failedGitHubCheckConclusions.has(run.conclusion)
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

export const getGitHubPullMergeState = async ({
  headers,
  owner,
  pullNumber,
  repo,
}: {
  headers: Record<string, string>;
  owner: string;
  pullNumber: number;
  repo: string;
}): Promise<boolean | null> => {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${String(pullNumber)}`,
    { headers }
  );

  if (!response.ok) {
    return null;
  }

  try {
    const pull = await parseResponseJson(
      response,
      githubPullDetailResponseSchema,
      "GitHub pull request"
    );
    return pull.merged;
  } catch (_error) {
    return null;
  }
};

export const getClosedPullRequestStatus = async ({
  activityLogs,
  headers,
  owner,
  pull,
  repo,
}: {
  activityLogs: ActivityLogEntry[];
  headers: Record<string, string>;
  owner: string;
  pull: z.infer<typeof githubPullSchema>;
  repo: string;
}): Promise<TaskStatusResponse | null> => {
  if (pull.state !== "closed") {
    return null;
  }

  const merged = await getGitHubPullMergeState({
    headers,
    owner,
    pullNumber: pull.number,
    repo,
  });

  if (merged === null) {
    return {
      status: "running",
      prUrl: pull.html_url,
      prNumber: pull.number,
      activityLogs: [
        ...activityLogs,
        log(
          "dev",
          "warning",
          `Could not check PR merge status for #${pull.number}`,
          pull.html_url
        ),
      ],
      tokensUsed: 0,
      estimatedCostUsd: 0,
    };
  }

  if (merged) {
    return {
      status: "completed",
      prUrl: pull.html_url,
      prNumber: pull.number,
      merged: true,
      ciStatus: "passed",
      activityLogs,
      tokensUsed: 0,
      estimatedCostUsd: 0,
    };
  }

  return {
    status: "failed",
    prUrl: pull.html_url,
    prNumber: pull.number,
    merged: false,
    ciStatus: "failed",
    activityLogs: [
      ...activityLogs,
      log(
        "dev",
        "error",
        `PR #${pull.number} was closed without merge`,
        pull.html_url
      ),
    ],
    tokensUsed: 0,
    estimatedCostUsd: 0,
  };
};

export const getPullRequestCiStatus = async ({
  activityLogs,
  adapterName,
  headers,
  owner,
  pull,
  repo,
  requireReadyForCompletion = false,
}: {
  activityLogs: ActivityLogEntry[];
  adapterName: string;
  headers: Record<string, string>;
  owner: string;
  pull: z.infer<typeof githubPullSchema>;
  repo: string;
  requireReadyForCompletion?: boolean;
}): Promise<TaskStatusResponse> => {
  const ciResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits/${pull.head.sha}/check-runs`,
    { headers }
  );

  if (!ciResponse.ok) {
    return createProviderStatusFailure(
      `${adapterName} CI`,
      ciResponse,
      activityLogs
    );
  }

  let ciData: z.infer<typeof githubCheckRunsResponseSchema>;
  try {
    ciData = await parseResponseJson(
      ciResponse,
      githubCheckRunsResponseSchema,
      "GitHub check runs"
    );
  } catch (error) {
    return createProviderParseFailure(
      `${adapterName} CI`,
      "check runs",
      error,
      activityLogs
    );
  }

  const { ciStatus, ciFailureLog } = parseGitHubCheckRuns(ciData.check_runs);
  const isComplete =
    ciStatus === "passed" && !(requireReadyForCompletion && pull.draft);

  let status: TaskStatusResponse["status"] = isComplete
    ? "completed"
    : "running";
  if (ciStatus === "failed") {
    status = "failed";
  }

  return {
    status,
    prUrl: pull.html_url,
    prNumber: pull.number,
    ciStatus,
    ciFailureLog,
    activityLogs,
    tokensUsed: 0,
    estimatedCostUsd: 0,
  };
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

export const createProviderStatusFailure = (
  adapterName: string,
  response: Response,
  existingLogs: ActivityLogEntry[] = []
): TaskStatusResponse => ({
  status: "running",
  activityLogs: [
    ...existingLogs,
    log(
      "system",
      "warning",
      `Could not check PR status for ${adapterName}: ${response.status}`,
      getProviderHttpStatusDetails(response)
    ),
  ],
  tokensUsed: 0,
  estimatedCostUsd: 0,
});

export const getProviderHttpStatusDetails = (response: Response): string => {
  const statusText = response.statusText.trim();
  const status = statusText
    ? `HTTP ${response.status} ${statusText}`
    : `HTTP ${response.status}`;
  return `${status}. Check the stored provider credentials, permissions, or rate limits.`;
};

export const formatProviderHttpError = (
  action: string,
  response: Response
): string => `${action} failed with ${getProviderHttpStatusDetails(response)}`;

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
