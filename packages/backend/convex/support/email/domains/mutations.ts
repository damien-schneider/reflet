import { ConvexError, v } from "convex/values";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import { mutation } from "../../../_generated/server";
import { validateDomainFormat } from "../../../domains/vercel";
import { requireOrgAdmin } from "../../../shared/access";
import {
  findSendingDomain,
  orgHasSupportEmailDomainPlan,
} from "../delivery_policy";

const ROOT_DOMAIN = "reflet.app";
const MIN_DOMAIN_LABELS = 3;
const FROM_LOCAL_PART_PATTERN = /^[a-z0-9._-]{1,64}$/;
const MANAGE_ACTION = "manage the support sending domain";

const normalizeFromLocalPart = (fromLocalPart: string): string => {
  const normalized = fromLocalPart.trim().toLowerCase();
  if (!FROM_LOCAL_PART_PATTERN.test(normalized)) {
    throw new ConvexError(
      "The sender name before @ can only use letters, numbers, dots, dashes and underscores (64 max)."
    );
  }
  return normalized;
};

const requireOwnSendingDomain = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">
) => {
  await requireOrgAdmin(ctx, organizationId, MANAGE_ACTION);
  const sendingDomain = await findSendingDomain(ctx, organizationId);
  if (!sendingDomain) {
    throw new ConvexError("No sending domain is configured.");
  }
  return sendingDomain;
};

export const addSendingDomain = mutation({
  args: {
    domain: v.string(),
    fromLocalPart: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId, MANAGE_ACTION);
    if (!(await orgHasSupportEmailDomainPlan(ctx, args.organizationId))) {
      throw new ConvexError("Sending from your own domain is a Pro feature.");
    }

    const domain = args.domain.trim().toLowerCase();
    if (
      !validateDomainFormat(domain) ||
      domain.split(".").length < MIN_DOMAIN_LABELS
    ) {
      throw new ConvexError(
        "Use a dedicated subdomain like support.example.com, not your root domain."
      );
    }
    if (domain === ROOT_DOMAIN || domain.endsWith(`.${ROOT_DOMAIN}`)) {
      throw new ConvexError(
        "reflet.app subdomains can't be used as a sending domain."
      );
    }
    const fromLocalPart = normalizeFromLocalPart(args.fromLocalPart);

    if (await findSendingDomain(ctx, args.organizationId)) {
      throw new ConvexError(
        "Remove your current sending domain before adding another."
      );
    }
    const taken = await ctx.db
      .query("supportSendingDomains")
      .withIndex("by_domain", (q) => q.eq("domain", domain))
      .first();
    if (taken) {
      throw new ConvexError(
        "This domain is already used by another organization."
      );
    }

    const now = Date.now();
    const sendingDomainId = await ctx.db.insert("supportSendingDomains", {
      createdAt: now,
      domain,
      fromLocalPart,
      lastCheckedAt: now,
      organizationId: args.organizationId,
      records: [],
      status: "not_started",
    });
    await ctx.scheduler.runAfter(
      0,
      internal.support.email.domains.actions.createResendDomain,
      { sendingDomainId }
    );
    return sendingDomainId;
  },
  returns: v.id("supportSendingDomains"),
});

export const checkSendingDomain = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const sendingDomain = await requireOwnSendingDomain(ctx, organizationId);
    await ctx.scheduler.runAfter(
      0,
      sendingDomain.status === "verified"
        ? internal.support.email.domains.actions.pollResendDomain
        : internal.support.email.domains.actions.verifyResendDomain,
      { sendingDomainId: sendingDomain._id }
    );
    return null;
  },
  returns: v.null(),
});

export const removeSendingDomain = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const sendingDomain = await requireOwnSendingDomain(ctx, organizationId);
    await ctx.db.delete(sendingDomain._id);
    if (sendingDomain.resendDomainId) {
      await ctx.scheduler.runAfter(
        0,
        internal.support.email.domains.actions.deleteResendDomain,
        { resendDomainId: sendingDomain.resendDomainId }
      );
    }
    return null;
  },
  returns: v.null(),
});

export const updateFromLocalPart = mutation({
  args: {
    fromLocalPart: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { fromLocalPart, organizationId }) => {
    const sendingDomain = await requireOwnSendingDomain(ctx, organizationId);
    await ctx.db.patch(sendingDomain._id, {
      fromLocalPart: normalizeFromLocalPart(fromLocalPart),
    });
    return null;
  },
  returns: v.null(),
});
