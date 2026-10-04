import type { Infer } from "convex/values";
import { v } from "convex/values";
import type { Doc } from "../../../_generated/dataModel";
import { internalMutation, internalQuery } from "../../../_generated/server";
import { sendingDomainRecord, type sendingDomainStatus } from "../tableFields";

type SendingDomainStatus = Infer<typeof sendingDomainStatus>;

const KNOWN_STATUSES: Record<SendingDomainStatus, true> = {
  failed: true,
  not_started: true,
  partially_failed: true,
  partially_verified: true,
  pending: true,
  temporary_failure: true,
  verified: true,
};

const isSendingDomainStatus = (status: string): status is SendingDomainStatus =>
  status in KNOWN_STATUSES;

const UNVERIFIED_STATUSES: SendingDomainStatus[] = [
  "not_started",
  "pending",
  "partially_verified",
  "partially_failed",
  "failed",
  "temporary_failure",
];

export const getSendingDomain = internalQuery({
  args: { sendingDomainId: v.id("supportSendingDomains") },
  handler: (ctx, { sendingDomainId }) => ctx.db.get(sendingDomainId),
});

export const listDomainsDueForCheck = internalQuery({
  args: {
    limit: v.number(),
    unverifiedBefore: v.number(),
    verifiedBefore: v.number(),
  },
  handler: async (ctx, { limit, unverifiedBefore, verifiedBefore }) => {
    const due: Doc<"supportSendingDomains">[] = [];
    for (const status of UNVERIFIED_STATUSES) {
      const remaining = limit - due.length;
      if (remaining <= 0) {
        break;
      }
      const rows = await ctx.db
        .query("supportSendingDomains")
        .withIndex("by_status_checked", (q) =>
          q.eq("status", status).lt("lastCheckedAt", unverifiedBefore)
        )
        .take(remaining);
      due.push(...rows);
    }
    const verified = await ctx.db
      .query("supportSendingDomains")
      .withIndex("by_status_checked", (q) =>
        q.eq("status", "verified").lt("lastCheckedAt", verifiedBefore)
      )
      .take(limit);
    return [...due, ...verified].map((domain) => ({
      organizationId: domain.organizationId,
      sendingDomainId: domain._id,
    }));
  },
});

export const storeResendDomain = internalMutation({
  args: {
    records: v.array(sendingDomainRecord),
    resendDomainId: v.string(),
    sendingDomainId: v.id("supportSendingDomains"),
    status: v.string(),
  },
  handler: async (
    ctx,
    { records, resendDomainId, sendingDomainId, status }
  ) => {
    if (!(await ctx.db.get(sendingDomainId))) {
      return false;
    }
    await ctx.db.patch(sendingDomainId, {
      error: undefined,
      lastCheckedAt: Date.now(),
      records,
      resendDomainId,
      status: isSendingDomainStatus(status) ? status : "pending",
    });
    return true;
  },
  returns: v.boolean(),
});

export const markVerificationRequested = internalMutation({
  args: { sendingDomainId: v.id("supportSendingDomains") },
  handler: async (ctx, { sendingDomainId }) => {
    if (!(await ctx.db.get(sendingDomainId))) {
      return null;
    }
    await ctx.db.patch(sendingDomainId, {
      error: undefined,
      lastCheckedAt: Date.now(),
    });
    return null;
  },
  returns: v.null(),
});

export const storeDomainError = internalMutation({
  args: {
    error: v.string(),
    sendingDomainId: v.id("supportSendingDomains"),
  },
  handler: async (ctx, { error, sendingDomainId }) => {
    if (!(await ctx.db.get(sendingDomainId))) {
      return null;
    }
    await ctx.db.patch(sendingDomainId, { error, lastCheckedAt: Date.now() });
    return null;
  },
  returns: v.null(),
});

export const deleteSendingDomainRow = internalMutation({
  args: { sendingDomainId: v.id("supportSendingDomains") },
  handler: async (ctx, { sendingDomainId }) => {
    const domain = await ctx.db.get(sendingDomainId);
    if (!domain) {
      return null;
    }
    await ctx.db.delete(sendingDomainId);
    return domain.resendDomainId ?? null;
  },
  returns: v.union(v.string(), v.null()),
});
