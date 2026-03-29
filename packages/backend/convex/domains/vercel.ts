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

export const validateDomainFormat = (domain: string): boolean => {
  return DOMAIN_FORMAT_REGEX.test(domain.toLowerCase());
};

const vercelDomainResponseSchema = z.object({
  name: z.string(),
  apexName: z.string().optional(),
  projectId: z.string().optional(),
  verified: z.boolean().optional(),
  verification: z
    .array(
      z.object({
        type: z.string(),
        domain: z.string(),
        value: z.string(),
        reason: z.string().optional(),
      })
    )
    .optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
});

const vercelDomainConfigSchema = z.object({
  configuredBy: z
    .union([
      z.literal("A"),
      z.literal("AAAA"),
      z.literal("CNAME"),
      z.literal("http"),
      z.null(),
    ])
    .optional(),
  acceptedChallenges: z.array(z.string()).optional(),
  misconfigured: z.boolean(),
});

export const addDomainToVercel = internalAction({
  args: { domain: v.string() },
  returns: v.object({
    success: v.boolean(),
    verification: v.optional(
      v.array(
        v.object({
          type: v.string(),
          domain: v.string(),
          value: v.string(),
          reason: v.optional(v.string()),
        })
      )
    ),
    error: v.optional(v.string()),
  }),
  handler: async (_ctx, args) => {
    const projectId = getProjectId();
    const response = await fetch(
      `${VERCEL_API_BASE}/v10/projects/${projectId}/domains?${getTeamParam()}`,
      {
        method: "POST",
        headers: getVercelHeaders(),
        body: JSON.stringify({ name: args.domain }),
      }
    );

    const raw: unknown = await response.json();
    const data = vercelDomainResponseSchema.parse(raw);

    if (data.error) {
      return { success: false, error: data.error.message };
    }

    return {
      success: true,
      verification: data.verification?.map((v) => ({
        type: v.type,
        domain: v.domain,
        value: v.value,
        reason: v.reason,
      })),
    };
  },
});

export const removeDomainFromVercel = internalAction({
  args: { domain: v.string() },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (_ctx, args) => {
    const projectId = getProjectId();
    const response = await fetch(
      `${VERCEL_API_BASE}/v9/projects/${projectId}/domains/${args.domain}?${getTeamParam()}`,
      {
        method: "DELETE",
        headers: getVercelHeaders(),
      }
    );

    if (!response.ok) {
      const raw: unknown = await response.json();
      const errorMessage =
        typeof raw === "object" && raw !== null && "error" in raw
          ? String((raw as { error: { message: string } }).error.message)
          : "Failed to remove domain from Vercel";
      return { success: false, error: errorMessage };
    }

    return { success: true };
  },
});

export const verifyDomain = internalAction({
  args: { domain: v.string() },
  returns: v.object({
    verified: v.boolean(),
    verification: v.optional(
      v.array(
        v.object({
          type: v.string(),
          domain: v.string(),
          value: v.string(),
          reason: v.optional(v.string()),
        })
      )
    ),
    error: v.optional(v.string()),
  }),
  handler: async (_ctx, args) => {
    const projectId = getProjectId();
    const response = await fetch(
      `${VERCEL_API_BASE}/v9/projects/${projectId}/domains/${args.domain}/verify?${getTeamParam()}`,
      {
        method: "POST",
        headers: getVercelHeaders(),
      }
    );

    const raw: unknown = await response.json();
    const data = vercelDomainResponseSchema.parse(raw);

    if (data.error) {
      return { verified: false, error: data.error.message };
    }

    return {
      verified: data.verified ?? false,
      verification: data.verification?.map((v) => ({
        type: v.type,
        domain: v.domain,
        value: v.value,
        reason: v.reason,
      })),
    };
  },
});

export const getDomainConfig = internalAction({
  args: { domain: v.string() },
  returns: v.object({
    misconfigured: v.boolean(),
    configuredBy: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (_ctx, args) => {
    const response = await fetch(
      `${VERCEL_API_BASE}/v6/domains/${args.domain}/config?${getTeamParam()}`,
      {
        method: "GET",
        headers: getVercelHeaders(),
      }
    );

    if (!response.ok) {
      return {
        misconfigured: true,
        error: "Failed to get domain configuration",
      };
    }

    const raw: unknown = await response.json();
    const data = vercelDomainConfigSchema.parse(raw);

    return {
      misconfigured: data.misconfigured,
      configuredBy: data.configuredBy ?? undefined,
    };
  },
});
