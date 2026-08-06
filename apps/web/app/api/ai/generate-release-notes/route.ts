import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createTextStreamResponse, streamText, toTextStream } from "ai";
import { z } from "zod";
import { getToken } from "@/lib/auth-server";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Free models to try in order, with a cheap paid model as last resort
const MODEL_FALLBACK_CHAIN = [
  "qwen/qwen3.6-plus-preview:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "minimax/minimax-m2.5:free",
  "stepfun/step-3.5-flash:free",
  "openai/gpt-5.4-mini",
] as const;

const MAX_COMMITS_FOR_CONTEXT = 100;
const MAX_FILES_FOR_CONTEXT = 50;

const commitInputSchema = z.object({
  author: z.string(),
  fullMessage: z.string().optional(),
  message: z.string(),
  sha: z.string(),
});

const fileInputSchema = z.object({
  additions: z.number(),
  deletions: z.number(),
  filename: z.string(),
  status: z.string(),
});

const requestBodySchema = z.object({
  commits: z.array(commitInputSchema),
  files: z.array(fileInputSchema).optional(),
  previousVersion: z.string().optional(),
  repositoryName: z.string().optional(),
  version: z.string().optional(),
});

/**
 * A model only fails once the stream is pulled, so the first chunk has to be
 * read here — otherwise the fallback chain can never advance past model one.
 */
async function openStreamForModel(
  modelId: string,
  prompt: string
): Promise<ReadableStream<string> | null> {
  const reader = toTextStream({
    stream: streamText({ model: openrouter(modelId), prompt }).stream,
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
    const { commits, files, version, previousVersion, repositoryName } = body;

    if (!commits || commits.length === 0) {
      return Response.json({ error: "No commits provided" }, { status: 400 });
    }

    const commitSummary = commits
      .slice(0, MAX_COMMITS_FOR_CONTEXT)
      .map((c) => `- ${c.message} (${c.sha} by @${c.author})`)
      .join("\n");

    const fileSummary = files
      ? files
          .slice(0, MAX_FILES_FOR_CONTEXT)
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
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
