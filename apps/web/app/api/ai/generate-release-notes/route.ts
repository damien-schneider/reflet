import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { api } from "@reflet/backend/convex/_generated/api";
import { AI_ACCESS_DENIED } from "@reflet/backend/convex/ai/constants";
import { createTextStreamResponse, streamText, toTextStream } from "ai";
import { ConvexError } from "convex/values";
import { z } from "zod";
import { fetchAuthMutation, getToken } from "@/lib/auth-server";
import { toOrgId } from "@/lib/convex-helpers";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MODEL_FALLBACK_CHAIN = [
  "qwen/qwen3.6-plus-preview:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "minimax/minimax-m2.5:free",
  "stepfun/step-3.5-flash:free",
  "openai/gpt-5.4-mini",
] as const;

const MAX_COMMITS = 100;
const MAX_FILES = 50;
const MAX_COMMIT_MESSAGE_LENGTH = 2000;
const MAX_FILENAME_LENGTH = 1000;
const MAX_SHORT_FIELD_LENGTH = 200;
const MAX_OUTPUT_TOKENS = 4000;

const shortField = z.string().max(MAX_SHORT_FIELD_LENGTH);
const clippedText = (maxLength: number) =>
  z.string().transform((value) => value.slice(0, maxLength));

const commitInputSchema = z.object({
  author: clippedText(MAX_SHORT_FIELD_LENGTH),
  message: clippedText(MAX_COMMIT_MESSAGE_LENGTH),
  sha: shortField,
});

const fileInputSchema = z.object({
  additions: z.number(),
  deletions: z.number(),
  filename: clippedText(MAX_FILENAME_LENGTH),
  status: shortField,
});

const requestBodySchema = z.object({
  commits: z.array(commitInputSchema).max(MAX_COMMITS),
  files: z.array(fileInputSchema).max(MAX_FILES).optional(),
  organizationId: shortField.min(1),
  previousVersion: shortField.optional(),
  repositoryName: shortField.optional(),
  version: shortField.optional(),
});

function convexErrorKind(error: unknown): unknown {
  if (!(error instanceof ConvexError)) {
    return;
  }
  const data: unknown = error.data;
  return typeof data === "object" && data !== null && "kind" in data
    ? data.kind
    : undefined;
}

/**
 * A model only fails once the stream is pulled, so the first chunk has to be
 * read here — otherwise the fallback chain can never advance past model one.
 */
async function openStreamForModel(
  modelId: string,
  prompt: string
): Promise<ReadableStream<string> | null> {
  const reader = toTextStream({
    stream: streamText({
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      model: openrouter(modelId),
      prompt,
    }).stream,
  }).getReader();

  let first: ReadableStreamReadResult<string>;
  try {
    first = await reader.read();
  } catch {
    reader.cancel().catch(() => {
      // stream already errored
    });
    console.warn(`[ai] Model ${modelId} failed, trying next fallback...`);
    return null;
  }

  let buffered = first.value;
  let exhausted = first.done;

  return new ReadableStream<string>({
    cancel: (reason) => reader.cancel(reason),
    async pull(controller) {
      if (buffered !== undefined) {
        controller.enqueue(buffered);
        buffered = undefined;
        return;
      }
      if (exhausted) {
        controller.close();
        return;
      }
      const { done, value } = await reader.read();
      if (done) {
        exhausted = true;
        controller.close();
        return;
      }
      if (value !== undefined) {
        controller.enqueue(value);
      }
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  try {
    if (!(await getToken())) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return Response.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    const body = requestBodySchema.parse(await request.json());
    const {
      commits,
      files,
      organizationId,
      version,
      previousVersion,
      repositoryName,
    } = body;

    if (commits.length === 0) {
      return Response.json({ error: "No commits provided" }, { status: 400 });
    }

    await fetchAuthMutation(api.ai.usage_gate.consumeAiGeneration, {
      organizationId: toOrgId(organizationId),
    });

    const commitSummary = commits
      .map((c) => `- ${c.message} (${c.sha} by @${c.author})`)
      .join("\n");

    const fileSummary = files
      ? files
          .map(
            (f) =>
              `- ${f.filename} (${f.status}: +${f.additions}/-${f.deletions})`
          )
          .join("\n")
      : "No file change data available";

    const versionInfo = version
      ? `Version: ${version}${previousVersion ? ` (from ${previousVersion})` : ""}`
      : "";

    const repoInfo = repositoryName ? `Repository: ${repositoryName}` : "";

    const prompt = `Generate professional, user-facing release notes in Markdown from the following git changes.

${versionInfo}
${repoInfo}

## Commits
${commitSummary}

## Files Changed
${fileSummary}

## Instructions
- Group changes into categories like **Features**, **Bug Fixes**, **Improvements**, **Breaking Changes** (only include categories that have items)
- Write from the user's perspective — explain what changed and why it matters, not the implementation details
- Use clear, concise bullet points
- Do NOT include commit SHAs, author names, or file paths unless they add context
- Do NOT add a title/heading — just the categorized content
- Skip merge commits, dependency bumps, and trivial changes unless they affect users
- If there are breaking changes, highlight them clearly
- Keep a professional but approachable tone
- Output only the markdown content, nothing else`;

    for (const modelId of MODEL_FALLBACK_CHAIN) {
      const stream = await openStreamForModel(modelId, prompt);
      if (stream) {
        return createTextStreamResponse({ stream });
      }
    }

    return Response.json({ error: "All AI models failed" }, { status: 503 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { details: error.issues, error: "Invalid request body" },
        { status: 400 }
      );
    }
    const errorKind = convexErrorKind(error);
    if (errorKind === "RateLimited") {
      return Response.json(
        { error: "AI generation limit reached, try again later" },
        { status: 429 }
      );
    }
    if (errorKind === AI_ACCESS_DENIED) {
      return Response.json(
        { error: "Only admins can use AI generation" },
        { status: 403 }
      );
    }
    console.error("[ai] Release notes generation failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
