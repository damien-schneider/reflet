import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { ActionCtx } from "../../../_generated/server";
import { internalAction } from "../../../_generated/server";
import {
  createDomain,
  deleteDomain,
  getDomain,
  verifyDomain,
} from "../resend_api";

const POLL_AFTER_VERIFY_MS = 30 * 1000;

// Resend reports "pending" while a verification it was just asked for runs, so the status is only read by a later poll.
const requestVerification = async (
  ctx: ActionCtx,
  sendingDomainId: Id<"supportSendingDomains">,
  resendDomainId: string
) => {
  const verification = await verifyDomain(resendDomainId);
  if ("error" in verification) {
    await ctx.runMutation(
      internal.support.email.domains.internal.storeDomainError,
      { error: verification.error, sendingDomainId }
    );
    return;
  }
  await ctx.runMutation(
    internal.support.email.domains.internal.markVerificationRequested,
    { sendingDomainId }
  );
  await ctx.scheduler.runAfter(
    POLL_AFTER_VERIFY_MS,
    internal.support.email.domains.actions.pollResendDomain,
    { sendingDomainId }
  );
};

export const createResendDomain = internalAction({
  args: { sendingDomainId: v.id("supportSendingDomains") },
  handler: async (ctx, { sendingDomainId }) => {
    const sendingDomain = await ctx.runQuery(
      internal.support.email.domains.internal.getSendingDomain,
      { sendingDomainId }
    );
    if (!sendingDomain) {
      return null;
    }
    const created = await createDomain(sendingDomain.domain);
    if ("error" in created) {
      await ctx.runMutation(
        internal.support.email.domains.internal.storeDomainError,
        { error: created.error, sendingDomainId }
      );
      return null;
    }
    const rowStillExists = await ctx.runMutation(
      internal.support.email.domains.internal.storeResendDomain,
      {
        records: created.data.records,
        resendDomainId: created.data.id,
        sendingDomainId,
        status: created.data.status,
      }
    );
    if (!rowStillExists) {
      await deleteDomain(created.data.id);
      return null;
    }
    await requestVerification(ctx, sendingDomainId, created.data.id);
    return null;
  },
  returns: v.null(),
});

export const verifyResendDomain = internalAction({
  args: { sendingDomainId: v.id("supportSendingDomains") },
  handler: async (ctx, { sendingDomainId }) => {
    const sendingDomain = await ctx.runQuery(
      internal.support.email.domains.internal.getSendingDomain,
      { sendingDomainId }
    );
    if (!sendingDomain) {
      return null;
    }
    if (!sendingDomain.resendDomainId) {
      await ctx.runAction(
        internal.support.email.domains.actions.createResendDomain,
        { sendingDomainId }
      );
      return null;
    }
    await requestVerification(
      ctx,
      sendingDomainId,
      sendingDomain.resendDomainId
    );
    return null;
  },
  returns: v.null(),
});

export const pollResendDomain = internalAction({
  args: { sendingDomainId: v.id("supportSendingDomains") },
  handler: async (ctx, { sendingDomainId }) => {
    const sendingDomain = await ctx.runQuery(
      internal.support.email.domains.internal.getSendingDomain,
      { sendingDomainId }
    );
    if (!sendingDomain) {
      return null;
    }
    if (!sendingDomain.resendDomainId) {
      await ctx.runAction(
        internal.support.email.domains.actions.createResendDomain,
        { sendingDomainId }
      );
      return null;
    }
    const result = await getDomain(sendingDomain.resendDomainId);
    if ("error" in result) {
      await ctx.runMutation(
        internal.support.email.domains.internal.storeDomainError,
        { error: result.error, sendingDomainId }
      );
      return null;
    }
    await ctx.runMutation(
      internal.support.email.domains.internal.storeResendDomain,
      {
        records: result.data.records,
        resendDomainId: sendingDomain.resendDomainId,
        sendingDomainId,
        status: result.data.status,
      }
    );
    return null;
  },
  returns: v.null(),
});

export const deleteResendDomain = internalAction({
  args: { resendDomainId: v.string() },
  handler: async (_ctx, { resendDomainId }) => {
    const result = await deleteDomain(resendDomainId);
    if ("error" in result) {
      throw new Error(`Resend domain deletion failed: ${result.error}`);
    }
    return null;
  },
  returns: v.null(),
});
