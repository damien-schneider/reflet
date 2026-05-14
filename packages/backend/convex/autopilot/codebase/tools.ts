"use node";

import { createTool } from "@mastra/core/tools";
import type { Octokit } from "octokit";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";

const MAX_FILE_BYTES = 100_000;
const MAX_TREE_ENTRIES = 1500;
const MAX_SEARCH_RESULTS = 10;

export interface CodebaseRuntime {
  ctx: ActionCtx;
  installationId: string;
  octokit: Octokit;
  repoFullName: string;
}

interface ToolContext {
  requestContext?: {
    get: (key: string) => unknown;
  };
}

function readRuntime(context: ToolContext): CodebaseRuntime {
  const value = context.requestContext?.get("codebase") as
    | CodebaseRuntime
    | undefined;
  if (!value) {
    throw new Error(
      "Codebase request context missing. Set 'codebase' before invoking the agent."
    );
  }
  return value;
}

function splitRepo(fullName: string): [string, string] {
  const [owner, repo] = fullName.split("/");
  if (!(owner && repo)) {
    throw new Error(`Invalid repoFullName: ${fullName}`);
  }
  return [owner, repo];
}

export const getRepoInfo = createTool({
  id: "get_repo_info",
  description:
    "Get repository metadata: description, topics, languages, default branch, homepage, latest commit SHA. Always call this FIRST to ground exploration.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    fullName: z.string(),
    description: z.string().nullable(),
    homepage: z.string().nullable(),
    languages: z.array(z.object({ name: z.string(), bytes: z.number() })),
    topics: z.array(z.string()),
    defaultBranch: z.string(),
    latestSha: z.string(),
    license: z.string().nullable(),
    stargazers: z.number(),
  }),
  execute: async (_input, context) => {
    const rt = readRuntime(context);
    const [owner, repo] = splitRepo(rt.repoFullName);

    const [{ data: info }, { data: langs }] = await Promise.all([
      rt.octokit.rest.repos.get({ owner, repo }),
      rt.octokit.rest.repos.listLanguages({ owner, repo }),
    ]);

    const { data: branch } = await rt.octokit.rest.repos.getBranch({
      owner,
      repo,
      branch: info.default_branch,
    });

    const languages = Object.entries(langs).map(([name, bytes]) => ({
      name,
      bytes: bytes as number,
    }));

    await rt.ctx.runMutation(
      internal.autopilot.codebase.mutations.upsertRepoMetadata,
      {
        installationId: rt.installationId,
        repoFullName: rt.repoFullName,
        description: info.description ?? undefined,
        languages,
        topics: info.topics ?? [],
        defaultBranch: info.default_branch,
        latestSha: branch.commit.sha,
      }
    );

    return {
      fullName: info.full_name,
      description: info.description,
      homepage: info.homepage,
      languages,
      topics: info.topics ?? [],
      defaultBranch: info.default_branch,
      latestSha: branch.commit.sha,
      license: info.license?.name ?? null,
      stargazers: info.stargazers_count,
    };
  },
});

export const listDirectory = createTool({
  id: "list_directory",
  description:
    "List files and folders at a given path in the repository. Use empty string for repo root. Returns name + type + size for each entry.",
  inputSchema: z.object({
    path: z
      .string()
      .default("")
      .describe("Directory path. Empty string = repo root."),
    ref: z
      .string()
      .optional()
      .describe("Branch or sha. Defaults to default branch."),
  }),
  outputSchema: z.array(
    z.object({
      name: z.string(),
      path: z.string(),
      type: z.string(),
      size: z.number().optional(),
    })
  ),
  execute: async (input, context) => {
    const rt = readRuntime(context);
    const [owner, repo] = splitRepo(rt.repoFullName);
    const rawPath = input.path ?? "";
    const cleanPath = rawPath === "." ? "" : rawPath;

    const { data } = await rt.octokit.rest.repos.getContent({
      owner,
      repo,
      path: cleanPath,
      ref: input.ref,
    });

    if (!Array.isArray(data)) {
      throw new Error(`Path '${cleanPath}' is not a directory`);
    }

    return data.map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type,
      size: item.size,
    }));
  },
});

export const listRepoTree = createTool({
  id: "list_repo_tree",
  description:
    "Recursive file tree of the repository (paths only). Capped at 1500 entries. Use this once early to map the repo, then drill into specific paths with list_directory or get_file_contents.",
  inputSchema: z.object({
    ref: z
      .string()
      .optional()
      .describe("Branch or sha. Default branch if omitted."),
  }),
  outputSchema: z.object({
    truncated: z.boolean(),
    entries: z.array(
      z.object({
        path: z.string(),
        type: z.string(),
        size: z.number().optional(),
      })
    ),
  }),
  execute: async (input, context) => {
    const rt = readRuntime(context);
    const [owner, repo] = splitRepo(rt.repoFullName);

    const ref = input.ref ?? "HEAD";
    const { data } = await rt.octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: ref,
      recursive: "1",
    });

    const tree = data.tree ?? [];
    const limited = tree.slice(0, MAX_TREE_ENTRIES);

    return {
      truncated: tree.length > MAX_TREE_ENTRIES || data.truncated === true,
      entries: limited
        .filter((node) => node.path !== undefined)
        .map((node) => ({
          path: node.path as string,
          type: node.type ?? "blob",
          size: node.size,
        })),
    };
  },
});

interface FileResult {
  bytes: number;
  content: string;
  path: string;
  sha: string;
  truncated: boolean;
}

async function executeGetFileContents(
  rt: CodebaseRuntime,
  input: { path: string; ref?: string }
): Promise<FileResult> {
  const [owner, repo] = splitRepo(rt.repoFullName);

  if (input.ref) {
    const cached: { content: string } | null = await rt.ctx.runQuery(
      internal.autopilot.codebase.queries.getCachedFile,
      {
        installationId: rt.installationId,
        repoFullName: rt.repoFullName,
        sha: input.ref,
        path: input.path,
      }
    );
    if (cached) {
      return {
        path: input.path,
        sha: input.ref,
        content: cached.content,
        truncated: false,
        bytes: cached.content.length,
      };
    }
  }

  const { data } = await rt.octokit.rest.repos.getContent({
    owner,
    repo,
    path: input.path,
    ref: input.ref,
  });

  if (Array.isArray(data) || data.type !== "file") {
    throw new Error(`Path '${input.path}' is not a file`);
  }

  if (data.encoding !== "base64" || !data.content) {
    throw new Error(
      `Cannot read '${input.path}': unsupported encoding (${data.encoding}) or binary file`
    );
  }

  const decoded = Buffer.from(data.content, "base64").toString("utf-8");
  const truncated = decoded.length > MAX_FILE_BYTES;
  const content = truncated
    ? `${decoded.slice(0, MAX_FILE_BYTES)}\n\n[truncated — ${decoded.length - MAX_FILE_BYTES} chars omitted]`
    : decoded;

  await rt.ctx.runMutation(internal.autopilot.codebase.mutations.cacheFile, {
    installationId: rt.installationId,
    repoFullName: rt.repoFullName,
    sha: data.sha,
    path: input.path,
    content,
  });

  return {
    path: input.path,
    sha: data.sha,
    content,
    truncated,
    bytes: decoded.length,
  };
}

export const getFileContents = createTool({
  id: "get_file_contents",
  description:
    "Read the full content of a file from the repository. Up to 100,000 chars (much more than legacy 4K). Cached by sha. Use this to read README, AGENTS.md, route/page files, config files.",
  inputSchema: z.object({
    path: z
      .string()
      .describe("File path from repo root, e.g. 'src/app/page.tsx'"),
    ref: z
      .string()
      .optional()
      .describe("Branch or sha. Defaults to default branch."),
  }),
  outputSchema: z.object({
    path: z.string(),
    sha: z.string(),
    content: z.string(),
    truncated: z.boolean(),
    bytes: z.number(),
  }),
  execute: async (input, context): Promise<FileResult> =>
    executeGetFileContents(readRuntime(context), input),
});

export const searchCode = createTool({
  id: "search_code",
  description:
    "GitHub Code Search across the connected repository. Returns up to 10 best matches with file paths and matched fragments. Use targeted queries (specific symbols or strings); for exhaustive grep, prefer multiple search_code calls with different queries — duplicates are deduped.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "Search expression, e.g. 'pricing tier', 'export default function'"
      ),
  }),
  outputSchema: z.array(
    z.object({
      path: z.string(),
      matches: z.array(z.string()),
    })
  ),
  execute: async (input, context) => {
    const rt = readRuntime(context);
    const { data } = await rt.octokit.rest.search.code({
      q: `${input.query} repo:${rt.repoFullName}`,
      per_page: MAX_SEARCH_RESULTS,
      headers: { accept: "application/vnd.github.text-match+json" },
    });
    return data.items.map((item) => ({
      path: item.path,
      matches: (item.text_matches ?? [])
        .map((m) => m.fragment ?? "")
        .filter(Boolean),
    }));
  },
});

export const listRecentPullRequests = createTool({
  id: "list_recent_pull_requests",
  description:
    "Recent pull requests (open + closed). Useful for inferring active workstreams and recently shipped features.",
  inputSchema: z.object({
    state: z
      .enum(["open", "closed", "all"])
      .default("all")
      .describe("PR state filter."),
    limit: z.number().min(1).max(30).default(20),
  }),
  outputSchema: z.array(
    z.object({
      number: z.number(),
      title: z.string(),
      state: z.string(),
      author: z.string().nullable(),
      labels: z.array(z.string()),
      mergedAt: z.string().nullable(),
      url: z.string(),
    })
  ),
  execute: async (input, context) => {
    const rt = readRuntime(context);
    const [owner, repo] = splitRepo(rt.repoFullName);
    const { data } = await rt.octokit.rest.pulls.list({
      owner,
      repo,
      state: input.state,
      per_page: input.limit,
      sort: "updated",
      direction: "desc",
    });
    return data.map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      author: pr.user?.login ?? null,
      labels: pr.labels.map((l) => l.name),
      mergedAt: pr.merged_at,
      url: pr.html_url,
    }));
  },
});

export const listRecentIssues = createTool({
  id: "list_recent_issues",
  description:
    "Recent issues (excludes PRs). Useful for inferring user pain points, requested features, bug patterns, product direction.",
  inputSchema: z.object({
    state: z.enum(["open", "closed", "all"]).default("all"),
    labels: z.string().optional().describe("Comma-separated label filter"),
    limit: z.number().min(1).max(30).default(20),
  }),
  outputSchema: z.array(
    z.object({
      number: z.number(),
      title: z.string(),
      state: z.string(),
      labels: z.array(z.string()),
      url: z.string(),
    })
  ),
  execute: async (input, context) => {
    const rt = readRuntime(context);
    const [owner, repo] = splitRepo(rt.repoFullName);
    const { data } = await rt.octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: input.state,
      per_page: input.limit,
      sort: "updated",
      direction: "desc",
      labels: input.labels,
    });
    return data
      .filter((issue) => !issue.pull_request)
      .map((issue) => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        labels: issue.labels.map((l) =>
          typeof l === "string" ? l : (l.name ?? "")
        ),
        url: issue.html_url,
      }));
  },
});

export const codebaseTools = {
  get_repo_info: getRepoInfo,
  list_repo_tree: listRepoTree,
  list_directory: listDirectory,
  get_file_contents: getFileContents,
  search_code: searchCode,
  list_recent_pull_requests: listRecentPullRequests,
  list_recent_issues: listRecentIssues,
} as const;

export type CodebaseTools = typeof codebaseTools;
