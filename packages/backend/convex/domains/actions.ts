import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

const DNS_OVER_HTTPS_URL = "https://cloudflare-dns.com/dns-query";
const DNS_RECORD_TYPE_TXT = 16;
const CHALLENGE_RECORD_PREFIX = "_reflet-challenge";
const TXT_SEGMENT_JOIN_PATTERN = /"\s+"/g;
const TXT_QUOTE_PATTERN = /^"|"$/g;

interface DnsJsonAnswer {
  data: string;
  type: number;
}

const hasChallengeTxtRecord = async (
  domain: string,
  token: string
): Promise<boolean> => {
  const query = new URL(DNS_OVER_HTTPS_URL);
  query.searchParams.set("name", `${CHALLENGE_RECORD_PREFIX}.${domain}`);
  query.searchParams.set("type", String(DNS_RECORD_TYPE_TXT));
  const response = await fetch(query, {
    headers: { accept: "application/dns-json" },
  });
  if (!response.ok) {
    return false;
  }
  const body: { Answer?: DnsJsonAnswer[] } = await response.json();
  return (body.Answer ?? []).some(
    (answer) =>
      answer.type === DNS_RECORD_TYPE_TXT &&
      answer.data
        .replace(TXT_SEGMENT_JOIN_PATTERN, "")
        .replace(TXT_QUOTE_PATTERN, "") === token
  );
};

export const verifyDomainAction = internalAction({
  args: {
    domain: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const challenge = await ctx.runMutation(
      internal.domains.internal.ensureDomainChallenge,
      args
    );
    if (!challenge) {
      return null;
    }

    const verifyResult = await ctx.runAction(
      internal.domains.vercel.verifyDomain,
      { domain: args.domain }
    );
    const statusUpdate = {
      domain: args.domain,
      organizationId: args.organizationId,
      verification: verifyResult.verification,
    };

    if (verifyResult.error) {
      await ctx.runMutation(internal.domains.internal.updateDomainStatus, {
        ...statusUpdate,
        error: verifyResult.error,
        status: "error",
      });
      return null;
    }

    if (!verifyResult.verified) {
      await ctx.runMutation(internal.domains.internal.updateDomainStatus, {
        ...statusUpdate,
        status: "pending_verification",
      });
      return null;
    }

    const configResult = await ctx.runAction(
      internal.domains.vercel.getDomainConfig,
      { domain: args.domain }
    );
    if (configResult.misconfigured) {
      await ctx.runMutation(internal.domains.internal.updateDomainStatus, {
        ...statusUpdate,
        error:
          "DNS is not configured correctly. Please add a CNAME record pointing to cname.vercel-dns.com.",
        status: "invalid_configuration",
      });
      return null;
    }

    const ownsDomain =
      challenge.isLegacyActive ||
      (await hasChallengeTxtRecord(args.domain, challenge.token));
    if (!ownsDomain) {
      await ctx.runMutation(internal.domains.internal.updateDomainStatus, {
        ...statusUpdate,
        error: `Ownership not verified. Add a TXT record named ${CHALLENGE_RECORD_PREFIX}.${args.domain} with the verification value shown in your domain settings.`,
        status: "pending_verification",
      });
      return null;
    }

    await ctx.runMutation(internal.domains.internal.updateDomainStatus, {
      ...statusUpdate,
      status: "active",
    });
    return null;
  },
  returns: v.null(),
});

export const checkSingleDomainStatus = internalAction({
  args: {
    domain: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await ctx.runAction(internal.domains.actions.verifyDomainAction, {
      domain: args.domain,
      organizationId: args.organizationId,
    });
  },
  returns: v.null(),
});

export const addDomainAction = internalAction({
  args: {
    domain: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const result = await ctx.runAction(
      internal.domains.vercel.addDomainToVercel,
      { domain: args.domain }
    );

    if (!result.success) {
      await ctx.runMutation(internal.domains.internal.updateDomainStatus, {
        domain: args.domain,
        error: result.error ?? "Failed to add domain to Vercel",
        organizationId: args.organizationId,
        status: "error",
      });
      return;
    }

    await ctx.runMutation(internal.domains.internal.updateDomainStatus, {
      domain: args.domain,
      organizationId: args.organizationId,
      status: "pending_verification",
      verification: result.verification,
    });

    await ctx.runAction(internal.domains.actions.verifyDomainAction, {
      domain: args.domain,
      organizationId: args.organizationId,
    });
  },
  returns: v.null(),
});

export const removeDomainAction = internalAction({
  args: {
    domain: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const result = await ctx.runAction(
      internal.domains.vercel.removeDomainFromVercel,
      { domain: args.domain }
    );

    if (!result.success) {
      await ctx.runMutation(internal.domains.internal.updateDomainStatus, {
        domain: args.domain,
        error: result.error ?? "Failed to remove domain from Vercel",
        organizationId: args.organizationId,
        status: "error",
      });
      return;
    }

    await ctx.runMutation(internal.domains.internal.clearDomainFields, {
      domain: args.domain,
      organizationId: args.organizationId,
    });
  },
  returns: v.null(),
});
