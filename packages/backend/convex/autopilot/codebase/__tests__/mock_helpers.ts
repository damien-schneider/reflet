import type {
  LanguageModelV3,
  LanguageModelV3FinishReason,
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamPart,
  LanguageModelV3StreamResult,
  LanguageModelV3Usage,
} from "@ai-sdk/provider";
import { convertArrayToReadableStream, MockLanguageModelV3 } from "ai/test";

const ZERO_USAGE: LanguageModelV3Usage = {
  inputTokens: {
    total: 50,
    noCache: 50,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: {
    total: 25,
    text: 25,
    reasoning: undefined,
  },
};

export interface ScriptedToolCall {
  args: Record<string, unknown>;
  toolCallId: string;
  toolName: string;
}

export interface ScriptedStep {
  text?: string;
  toolCalls?: ScriptedToolCall[];
}

function buildGenerateResult(
  step: ScriptedStep
): LanguageModelV3GenerateResult {
  const finishReason: LanguageModelV3FinishReason =
    step.toolCalls && step.toolCalls.length > 0
      ? { unified: "tool-calls", raw: "tool_calls" }
      : { unified: "stop", raw: "stop" };

  const content: LanguageModelV3GenerateResult["content"] = [];
  if (step.text) {
    content.push({ type: "text", text: step.text });
  }
  for (const call of step.toolCalls ?? []) {
    content.push({
      type: "tool-call",
      toolCallId: call.toolCallId,
      toolName: call.toolName,
      input: JSON.stringify(call.args),
    });
  }

  return {
    content,
    finishReason,
    usage: ZERO_USAGE,
    warnings: [],
  };
}

function buildStreamParts(step: ScriptedStep): LanguageModelV3StreamPart[] {
  const parts: LanguageModelV3StreamPart[] = [
    { type: "stream-start", warnings: [] },
  ];

  if (step.text) {
    const id = `text-${Math.random().toString(36).slice(2, 8)}`;
    parts.push({ type: "text-start", id });
    parts.push({ type: "text-delta", id, delta: step.text });
    parts.push({ type: "text-end", id });
  }

  for (const call of step.toolCalls ?? []) {
    parts.push({
      type: "tool-input-start",
      id: call.toolCallId,
      toolName: call.toolName,
    });
    parts.push({
      type: "tool-call",
      toolCallId: call.toolCallId,
      toolName: call.toolName,
      input: JSON.stringify(call.args),
    });
  }

  const finishReason: LanguageModelV3FinishReason =
    step.toolCalls && step.toolCalls.length > 0
      ? { unified: "tool-calls", raw: "tool_calls" }
      : { unified: "stop", raw: "stop" };

  parts.push({
    type: "finish",
    finishReason,
    usage: ZERO_USAGE,
  });

  return parts;
}

function buildStreamResult(step: ScriptedStep): LanguageModelV3StreamResult {
  return {
    stream: convertArrayToReadableStream(buildStreamParts(step)),
  };
}

function pickResult<T>(arr: T[], idx: number): T | undefined {
  if (idx < arr.length) {
    return arr[idx];
  }
  if (arr.length === 0) {
    return undefined;
  }
  // biome-ignore lint/style/useAtIndex: convex tsconfig targets ES2021 which lacks Array.at
  return arr[arr.length - 1];
}

export function createScriptedModel(
  steps: ScriptedStep[],
  modelId = "mock/model"
): LanguageModelV3 {
  const generateResults = steps.map(buildGenerateResult);
  const streamResults = steps.map(buildStreamResult);

  let generateIdx = 0;
  let streamIdx = 0;

  return new MockLanguageModelV3({
    provider: "mock",
    modelId,
    doGenerate: () => {
      const result = pickResult(generateResults, generateIdx);
      generateIdx++;
      if (!result) {
        return Promise.reject(new Error("No more scripted generate results"));
      }
      return Promise.resolve(result);
    },
    doStream: () => {
      const result = pickResult(streamResults, streamIdx);
      streamIdx++;
      if (!result) {
        return Promise.reject(new Error("No more scripted stream results"));
      }
      return Promise.resolve(result);
    },
  });
}

export function createFailingModel(
  errorMessage: string,
  modelId = "mock/failing"
): LanguageModelV3 {
  return new MockLanguageModelV3({
    provider: "mock",
    modelId,
    doGenerate: () => Promise.reject(new Error(errorMessage)),
    doStream: () => Promise.reject(new Error(errorMessage)),
  });
}

export interface FakeOctokitOptions {
  description?: string;
  files?: Record<string, string>;
  fullName?: string;
  issues?: Array<{ number: number; title: string; state: string }>;
  pulls?: Array<{ number: number; title: string; state: string }>;
  searchHits?: Record<string, Array<{ path: string; fragment: string }>>;
  topics?: string[];
  treePaths?: string[];
}

interface OctokitContentDir {
  name: string;
  path: string;
  size: number;
  type: string;
}

interface OctokitContentFile {
  content: string;
  encoding: "base64";
  sha: string;
  size: number;
  type: "file";
}

export function createFakeOctokit(opts: FakeOctokitOptions = {}) {
  const fullName = opts.fullName ?? "octocat/hello-world";
  const description = opts.description ?? "A test repo";
  const topics = opts.topics ?? ["saas", "ai"];
  const files = opts.files ?? {
    "README.md": "# Hello World\n\nA SaaS for testing repos.",
    "package.json": '{"name":"hello-world","dependencies":{"next":"^14"}}',
  };
  const tree = opts.treePaths ?? Object.keys(files);
  const pulls = opts.pulls ?? [
    { number: 1, title: "feat: initial setup", state: "closed" },
    { number: 2, title: "feat: add dashboard", state: "closed" },
  ];
  const issues = opts.issues ?? [
    { number: 10, title: "Bug in login", state: "open" },
  ];
  const searchHits = opts.searchHits ?? {};

  return {
    rest: {
      repos: {
        get: async () => ({
          data: {
            full_name: fullName,
            description,
            homepage: null,
            topics,
            default_branch: "main",
            license: { name: "MIT" },
            stargazers_count: 100,
          },
        }),
        listLanguages: async () => ({
          data: { TypeScript: 10_000, CSS: 1000 },
        }),
        getBranch: async () => ({
          data: { commit: { sha: "abc123" } },
        }),
        getContent: (params: { path: string }) => {
          const path = params.path;
          if (path === "" || path === ".") {
            const data: OctokitContentDir[] = tree.map((p) => ({
              name: p.split("/").pop() ?? p,
              path: p,
              type: "file",
              size: files[p]?.length ?? 0,
            }));
            return Promise.resolve({ data });
          }
          const content = files[path];
          if (content === undefined) {
            return Promise.reject(new Error(`File not found: ${path}`));
          }
          const data: OctokitContentFile = {
            type: "file",
            encoding: "base64",
            content: Buffer.from(content).toString("base64"),
            sha: `sha-${path}`,
            size: content.length,
          };
          return Promise.resolve({ data });
        },
      },
      git: {
        getTree: async () => ({
          data: {
            tree: tree.map((p) => ({ path: p, type: "blob", size: 100 })),
            truncated: false,
          },
        }),
      },
      search: {
        code: (params: { q: string }) => {
          const q = params.q.split(" repo:")[0];
          const items = (searchHits[q] ?? []).map((hit) => ({
            path: hit.path,
            text_matches: [{ fragment: hit.fragment }],
          }));
          return Promise.resolve({ data: { items } });
        },
      },
      pulls: {
        list: async () => ({
          data: pulls.map((pr) => ({
            number: pr.number,
            title: pr.title,
            state: pr.state,
            user: { login: "tester" },
            labels: [],
            merged_at: null,
            html_url: `https://github.com/${fullName}/pull/${pr.number}`,
          })),
        }),
      },
      issues: {
        listForRepo: async () => ({
          data: issues.map((i) => ({
            number: i.number,
            title: i.title,
            state: i.state,
            labels: [],
            html_url: `https://github.com/${fullName}/issues/${i.number}`,
            pull_request: undefined,
          })),
        }),
      },
    },
  };
}
