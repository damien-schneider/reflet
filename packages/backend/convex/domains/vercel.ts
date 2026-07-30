import { v } from "convex/values";
import { z } from "zod";
import { internalAction } from "../_generated/server";

const VERCEL_API_BASE = "https://api.vercel.com";

const DOMAIN_FORMAT_REGEX =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

const getVercelHeaders = (): Record<string, string> => {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) {
    throw new Error("VERCEL_API_TOKEN environment variable is not set");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

const getTeamParam = (): string => {
  const teamId = process.env.VERCEL_TEAM_ID;
  return teamId ? `&teamId=${teamId}` : "";
};

const getProjectId = (): string => {
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!projectId) {
    throw new Error("VERCEL_PROJECT_ID environment variable is not set");
  }
  return projectId;
};

export const validateDomainFormat = (domain: string): boolean =>
  DOMAIN_FORMAT_REGEX.test(domain.toLowerCase());

const vercelDomainResponseSchema = z.object({
  apexName: z.string().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
  name: z.string(),
  projectId: z.string().optional(),
  verification: z
    .array(
      z.object({
        domain: z.string(),
        reason: z.string().optional(),
        type: z.string(),
        value: z.string(),
      })
    )
    .optional(),
  verified: z.boolean().optional(),
});

const vercelDomainConfigSchema = z.object({
  acceptedChallenges: z.array(z.string()).optional(),
  configuredBy: z
    .union([
      z.literal("A"),
      z.literal("AAAA"),
      z.literal("CNAME"),
      z.literal("http"),
      z.null(),
    ])
    .optional(),
  misconfigured: z.boolean(),
});

export const addDomainToVercel = internalAction({
  args: { domain: v.string() },
  handler: async (_ctx, args) => {
    const projectId = getProjectId();
    const response = await fetch(
      `${VERCEL_API_BASE}/v10/projects/${projectId}/domains?${getTeamParam()}`,
      {
        body: JSON.stringify({ name: args.domain }),
        headers: getVercelHeaders(),
        method: "POST",
      }
    );

    const raw: unknown = await response.json();
    const data = vercelDomainResponseSchema.parse(raw);

    if (data.error) {
      return { error: data.error.message, success: false };
    }

    return {
      success: true,
      verification: data.verification?.map((v) => ({
        domain: v.domain,
        reason: v.reason,
        type: v.type,
        value: v.value,
      })),
    };
  },
  returns: v.object({
    error: v.optional(v.string()),
    success: v.boolean(),
    verification: v.optional(
      v.array(
        v.object({
          domain: v.string(),
          reason: v.optional(v.string()),
          type: v.string(),
          value: v.string(),
        })
      )
    ),
  }),
});

export const removeDomainFromVercel = internalAction({
  args: { domain: v.string() },
  handler: async (_ctx, args) => {
    const projectId = getProjectId();
    const response = await fetch(
      `${VERCEL_API_BASE}/v9/projects/${projectId}/domains/${args.domain}?${getTeamParam()}`,
      {
        headers: getVercelHeaders(),
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const raw: unknown = await response.json();
      const errorMessage =
        typeof raw === "object" && raw !== null && "error" in raw
          ? String((raw as { error: { message: string } }).error.message)
          : "Failed to remove domain from Vercel";
      return { error: errorMessage, success: false };
    }

    return { success: true };
  },
  returns: v.object({
    error: v.optional(v.string()),
    success: v.boolean(),
  }),
});

export const verifyDomain = internalAction({
  args: { domain: v.string() },
  handler: async (_ctx, args) => {
    const projectId = getProjectId();
    const response = await fetch(
      `${VERCEL_API_BASE}/v9/projects/${projectId}/domains/${args.domain}/verify?${getTeamParam()}`,
      {
        headers: getVercelHeaders(),
        method: "POST",
      }
    );

    const raw: unknown = await response.json();
    const data = vercelDomainResponseSchema.parse(raw);

    if (data.error) {
      return { error: data.error.message, verified: false };
    }

    return {
      verification: data.verification?.map((v) => ({
        domain: v.domain,
        reason: v.reason,
        type: v.type,
        value: v.value,
      })),
      verified: data.verified ?? false,
    };
  },
  returns: v.object({
    error: v.optional(v.string()),
    verification: v.optional(
      v.array(
        v.object({
          domain: v.string(),
          reason: v.optional(v.string()),
          type: v.string(),
          value: v.string(),
        })
      )
    ),
    verified: v.boolean(),
  }),
});

export const getDomainConfig = internalAction({
  args: { domain: v.string() },
  handler: async (_ctx, args) => {
    const response = await fetch(
      `${VERCEL_API_BASE}/v6/domains/${args.domain}/config?${getTeamParam()}`,
      {
        headers: getVercelHeaders(),
        method: "GET",
      }
    );

    if (!response.ok) {
      return {
        error: "Failed to get domain configuration",
        misconfigured: true,
      };
    }

    const raw: unknown = await response.json();
    const data = vercelDomainConfigSchema.parse(raw);

    return {
      configuredBy: data.configuredBy ?? undefined,
      misconfigured: data.misconfigured,
    };
  },
  returns: v.object({
    configuredBy: v.optional(v.string()),
    error: v.optional(v.string()),
    misconfigured: v.boolean(),
  }),
});
