import { z } from "zod";
import type {
  BridgeApi,
  BridgeClaimResult,
  BridgeCompletionInput,
  BridgeEventInput,
  BridgeFailureInput,
  BridgeRegistrationInput,
  BridgeRegistrationResult,
} from "./types";

const bridgeJobSchema = z.object({
  id: z.string().min(1),
  recipeId: z.string().min(1),
  recipeVersion: z.number().int().positive(),
  title: z.string().min(1),
  worktreeBranch: z.string().min(1),
});

const registrationResultSchema = z.object({
  bridgeInstallationId: z.string().min(1),
});

const claimResultSchema = z.object({
  job: z.union([bridgeJobSchema, z.null()]),
});

const RETRY_DELAYS_MS = [100, 300] as const;

export interface BridgeApiClientInput {
  secretKey: string;
  siteUrl: string;
}

function isRetriableFetchError(error: unknown): boolean {
  return error instanceof TypeError && error.message === "fetch failed";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return {};
  }
  return JSON.parse(text);
}

async function retryFetch(operation: () => Promise<unknown>): Promise<unknown> {
  let lastError: unknown;
  for (const delayMs of [0, ...RETRY_DELAYS_MS]) {
    if (delayMs > 0) {
      await wait(delayMs);
    }
    try {
      return await operation();
    } catch (error) {
      if (!isRetriableFetchError(error)) {
        throw error;
      }
      lastError = error;
    }
  }
  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error("Bridge API failed");
}

export function createBridgeApiClient({
  secretKey,
  siteUrl,
}: BridgeApiClientInput): BridgeApi {
  const postOnce = async (path: string, body: unknown): Promise<unknown> => {
    const response = await fetch(`${siteUrl}${path}`, {
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const data = await parseJson(response);
    if (!response.ok) {
      const error = z.object({ error: z.string() }).safeParse(data);
      throw new Error(error.success ? error.data.error : "Bridge API failed");
    }
    return data;
  };
  const post = (path: string, body: unknown): Promise<unknown> =>
    retryFetch(() => postOnce(path, body));

  return {
    appendEvent: async (input: BridgeEventInput) => {
      await post("/api/v1/admin/bridge/event", input);
    },
    claimJob: async (input): Promise<BridgeClaimResult> =>
      claimResultSchema.parse(await post("/api/v1/admin/bridge/claim", input)),
    completeJob: async (input: BridgeCompletionInput) => {
      await post("/api/v1/admin/bridge/complete", input);
    },
    failJob: async (input: BridgeFailureInput) => {
      await post("/api/v1/admin/bridge/fail", input);
    },
    heartbeat: async (input) => {
      await post("/api/v1/admin/bridge/heartbeat", input);
    },
    register: async (
      input: BridgeRegistrationInput
    ): Promise<BridgeRegistrationResult> =>
      registrationResultSchema.parse(
        await post("/api/v1/admin/bridge/register", input)
      ),
  };
}
