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

export interface BridgeApiClientInput {
  secretKey: string;
  siteUrl: string;
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return {};
  }
  return JSON.parse(text);
}

export function createBridgeApiClient({
  secretKey,
  siteUrl,
}: BridgeApiClientInput): BridgeApi {
  const post = async (path: string, body: unknown): Promise<unknown> => {
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
