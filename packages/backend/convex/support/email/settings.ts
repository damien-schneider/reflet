import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { mutation, query } from "../../_generated/server";
import { normalizeEmail } from "../../email/suppression";
import { requireOrgAdmin } from "../../shared/access";
import { MAX_EMAIL_LENGTH } from "../../shared/constants";
import { randomSecretHex } from "../../shared/hmac";
import { rateLimiter } from "../../shared/rate_limits";
import { isValidEmail } from "../../shared/validators";
import { SUPPORT_INBOUND_DOMAIN } from "./client";
import {
  findSendingDomain,
  findSupportEmailSettings,
  orgHasSupportEmailDomainPlan,
} from "./delivery_policy";
import {
  sendingDomainRecord,
  sendingDomainStatus,
  sendingPauseReason,
} from "./tableFields";

const MAX_ALIAS_ATTEMPTS = 5;
const ALIAS_SLUG_MAX_LENGTH = 40;
const ALIAS_INVALID_CHARACTERS = /[^a-z0-9-]/g;

const ensureSettings = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">
) => {
  const existing = await findSupportEmailSettings(ctx, organizationId);
  if (existing) {
    return existing;
  }
  const settingsId = await ctx.db.insert("supportEmailSettings", {
    createdAt: Date.now(),
    organizationId,
  });
  const created = await ctx.db.get(settingsId);
  if (!created) {
    throw new Error("Support email settings could not be created");
  }
  return created;
};

const uniqueAlias = async (ctx: MutationCtx, slug: string) => {
  const base = slug
    .toLowerCase()
    .replace(ALIAS_INVALID_CHARACTERS, "-")
    .slice(0, ALIAS_SLUG_MAX_LENGTH);
  for (let attempt = 0; attempt < MAX_ALIAS_ATTEMPTS; attempt++) {
    const alias = `${base}-${randomSecretHex(4)}`;
    const taken = await ctx.db
      .query("supportEmailSettings")
      .withIndex("by_inbound_alias", (q) => q.eq("inboundAlias", alias))
      .first();
    if (!taken) {
      return alias;
    }
  }
  throw new ConvexError("Couldn’t create a unique support address. Try again.");
};

const settingsView = v.object({
  domain: v.union(
    v.null(),
    v.object({
      _id: v.id("supportSendingDomains"),
      domain: v.string(),
      error: v.optional(v.string()),
      fromLocalPart: v.string(),
      lastCheckedAt: v.number(),
      records: v.array(sendingDomainRecord),
      status: sendingDomainStatus,
    })
  ),
  forwardingAddress: v.optional(v.string()),
  forwardingVerifiedAt: v.optional(v.number()),
  gmailConfirmation: v.optional(
    v.object({
      confirmationUrl: v.optional(v.string()),
      excerpt: v.string(),
      receivedAt: v.number(),
      subject: v.string(),
    })
  ),
  inboundAddress: v.optional(v.string()),
  inboundAlias: v.optional(v.string()),
  isPro: v.boolean(),
  sendingPausedAt: v.optional(v.number()),
  sendingPauseReason: v.optional(sendingPauseReason),
});

export const get = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await requireOrgAdmin(ctx, organizationId, "manage support email");
    const settings = await findSupportEmailSettings(ctx, organizationId);
    const domain = await findSendingDomain(ctx, organizationId);
    const alias = settings?.inboundAlias;
    return {
      domain: domain
        ? {
            _id: domain._id,
            domain: domain.domain,
            error: domain.error,
            fromLocalPart: domain.fromLocalPart,
            lastCheckedAt: domain.lastCheckedAt,
            records: domain.records,
            status: domain.status,
          }
        : null,
      forwardingAddress: settings?.forwardingAddress,
      forwardingVerifiedAt: settings?.forwardingVerifiedAt,
      gmailConfirmation: settings?.gmailConfirmation,
      inboundAddress: alias ? `${alias}@${SUPPORT_INBOUND_DOMAIN}` : undefined,
      inboundAlias: alias,
      isPro: await orgHasSupportEmailDomainPlan(ctx, organizationId),
      sendingPausedAt: settings?.sendingPausedAt,
      sendingPauseReason: settings?.sendingPauseReason,
    };
  },
  returns: settingsView,
});

export const createInboundAlias = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await requireOrgAdmin(ctx, organizationId, "manage support email");
    const organization = await ctx.db.get(organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }
    const settings = await ensureSettings(ctx, organizationId);
    if (settings.inboundAlias) {
      return settings.inboundAlias;
    }
    const alias = await uniqueAlias(ctx, organization.slug);
    await ctx.db.patch(settings._id, { inboundAlias: alias });
    return alias;
  },
  returns: v.string(),
});

export const setForwardingAddress = mutation({
  args: { address: v.string(), organizationId: v.id("organizations") },
  handler: async (ctx, { address, organizationId }) => {
    await requireOrgAdmin(ctx, organizationId, "manage support email");
    const normalized = normalizeEmail(address);
    if (normalized.length > MAX_EMAIL_LENGTH || !isValidEmail(normalized)) {
      throw new ConvexError("Enter a valid email address.");
    }
    if (normalized.endsWith(`@${SUPPORT_INBOUND_DOMAIN}`)) {
      throw new ConvexError(
        "Use the mailbox you forward from, not a Reflet address."
      );
    }
    const settings = await ensureSettings(ctx, organizationId);
    await ctx.db.patch(settings._id, {
      forwardingAddress: normalized,
      forwardingTestCode: undefined,
      forwardingVerifiedAt: undefined,
    });
    return null;
  },
  returns: v.null(),
});

export const sendForwardingTest = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await requireOrgAdmin(ctx, organizationId, "manage support email");
    const organization = await ctx.db.get(organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }
    const settings = await findSupportEmailSettings(ctx, organizationId);
    if (!(settings?.inboundAlias && settings.forwardingAddress)) {
      throw new ConvexError(
        "Create your support address and set a forwarding address first."
      );
    }
    const limit = await rateLimiter.limit(ctx, "supportForwardingTestPerOrg", {
      key: organizationId,
    });
    if (!limit.ok) {
      throw new ConvexError("Too many test emails. Try again in an hour.");
    }
    const code = randomSecretHex(6);
    await ctx.db.patch(settings._id, {
      forwardingTestCode: code,
      forwardingVerifiedAt: undefined,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.support.email.render.sendForwardingTest,
      {
        code,
        organizationId,
        organizationName: organization.name,
        to: settings.forwardingAddress,
      }
    );
    return null;
  },
  returns: v.null(),
});
