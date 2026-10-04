import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { api } from "@reflet/backend/convex/_generated/api";
import { AI_ACCESS_DENIED } from "@reflet/backend/convex/ai/constants";
import { RELEASE_NOTES_MODEL_CHAIN } from "@reflet/backend/convex/changelog/ai/models";
import { buildReleaseNotesPrompt } from "@reflet/backend/convex/changelog/ai/prompts";
import {
  MAX_SOURCE_COMMITS,
  MAX_SOURCE_FILES,
  MAX_SOURCE_PULL_REQUESTS,
} from "@reflet/backend/convex/changelog/source";
import { env } from "@reflet/env/server";
import { createTextStreamResponse, streamText, toTextStream } from "ai";
import { ConvexError } from "convex/values";
import { z } from "zod";
import { fetchAuthMutation, getToken } from "@/lib/auth-server";
import { toOrgId } from "@/lib/convex-helpers";

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

const MAX_COMMIT_MESSAGE_LENGTH = 2000;
const MAX_PULL_REQUEST_BODY_LENGTH = 2000;
const MAX_MAINTAINER_NOTES_LENGTH = 20_000;
const MAX_FILENAME_LENGTH = 1000;
const MAX_SHORT_FIELD_LENGTH = 200;
const MAX_OUTPUT_TOKENS = 4000;

const shortField = z.string().max(MAX_SHORT_FIELD_LENGTH);
const clippedText = (maxLength: number) =>
  z.string().transform((value) => value.slice(0, maxLength));

const sourceSchema = z.object({
  baseRef: shortField.optional(),
  commits: z
    .array(
      z.object({
        author: clippedText(MAX_SHORT_FIELD_LENGTH),
        date: shortField,
        fullMessage: clippedText(MAX_COMMIT_MESSAGE_LENGTH),
        message: clippedText(MAX_COMMIT_MESSAGE_LENGTH),
        sha: shortField,
      })
    )
    .max(MAX_SOURCE_COMMITS),
  files: z
    .array(
      z.object({
        additions: z.number(),
        deletions: z.number(),
        filename: clippedText(MAX_FILENAME_LENGTH),
        status: shortField,
      })
    )
    .max(MAX_SOURCE_FILES),
  headRef: shortField,
  headSha: shortField,
  maintainerNotes: clippedText(MAX_MAINTAINER_NOTES_LENGTH).optional(),
  pullRequests: z
    .array(
      z.object({
        body: clippedText(MAX_PULL_REQUEST_BODY_LENGTH).optional(),
        number: z.number(),
        title: clippedText(MAX_SHORT_FIELD_LENGTH),
        url: shortField,
      })
    )
    .max(MAX_SOURCE_PULL_REQUESTS),
  totalCommits: z.number(),
});

const requestBodySchema = z.object({
  organizationId: shortField.min(1),
  releaseId: shortField.min(1),
  repositoryName: shortField.optional(),
  source: sourceSchema,
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

    if (!env.OPENROUTER_API_KEY) {
      return Response.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    const { organizationId, repositoryName, source, version } =
      requestBodySchema.parse(await request.json());

    const hasSourceMaterial =
      source.commits.length > 0 ||
      source.pullRequests.length > 0 ||
      Boolean(source.maintainerNotes);
    if (!hasSourceMaterial) {
      return Response.json(
        { error: "No source material provided" },
        { status: 400 }
      );
    }

    await fetchAuthMutation(api.ai.usage_gate.consumeAiGeneration, {
      organizationId: toOrgId(organizationId),
    });

    const prompt = buildReleaseNotesPrompt({
      ...source,
      repositoryName,
      version,
    });

    for (const modelId of RELEASE_NOTES_MODEL_CHAIN) {
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
