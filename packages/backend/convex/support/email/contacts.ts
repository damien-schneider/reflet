import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "../../_generated/server";
import {
  addSuppressionOnce,
  isSupportRecipientSuppressed,
  normalizeEmail,
} from "../../email/suppression";
import { randomSecretHex } from "../../shared/hmac";
import { rateLimiter } from "../../shared/rate_limits";
import { findConversationIdByThreadToken } from "../thread_tokens";
import {
  customerRecipient,
  findSendingDomain,
  findSupportContact,
  orgHasSupportEmailDomainPlan,
} from "./delivery_policy";

const VERIFICATION_TOKEN_BYTES = 16;

export const markContactVerified = async (
  ctx: MutationCtx,
  args: { email: string; organizationId: Id<"organizations"> }
): Promise<void> => {
  const now = Date.now();
  const contact = await findSupportContact(
    ctx,
    args.organizationId,
    args.email
  );
  if (contact) {
    if (contact.verifiedAt === undefined) {
      await ctx.db.patch(contact._id, {
        verificationToken: undefined,
        verifiedAt: now,
      });
    }
    return;
  }
  await ctx.db.insert("supportContacts", {
    createdAt: now,
    email: normalizeEmail(args.email),
    organizationId: args.organizationId,
    verifiedAt: now,
  });
};

const repliesGoOutInFull = async (
  ctx: QueryCtx,
  organizationId: Id<"organizations">
): Promise<boolean> => {
  const domain = await findSendingDomain(ctx, organizationId);
  return (
    domain?.status === "verified" &&
    (await orgHasSupportEmailDomainPlan(ctx, organizationId))
  );
};
const upsertPendingContact = async (
  ctx: MutationCtx,
  args: { email: string; organizationId: Id<"organizations"> }
): Promise<{ contactId: Id<"supportContacts">; token: string }> => {
  const contact = await findSupportContact(
    ctx,
    args.organizationId,
    args.email
  );
  if (contact?.verificationToken) {
    return { contactId: contact._id, token: contact.verificationToken };
  }
  const token = randomSecretHex(VERIFICATION_TOKEN_BYTES);
  if (contact) {
    await ctx.db.patch(contact._id, { verificationToken: token });
    return { contactId: contact._id, token };
  }
  const contactId = await ctx.db.insert("supportContacts", {
    createdAt: Date.now(),
    email: normalizeEmail(args.email),
    organizationId: args.organizationId,
    verificationToken: token,
  });
  return { contactId, token };
};

const hasConfirmationEmailBudget = async (
  ctx: MutationCtx,
  email: string,
  organizationId: Id<"organizations">
): Promise<boolean> => {
  const perOrganization = await rateLimiter.limit(
    ctx,
    "supportContactConfirmationPerEmail",
    { key: `${organizationId}:${email}`, throws: false }
  );
  if (!perOrganization.ok) {
    return false;
  }
  const acrossOrganizations = await rateLimiter.limit(
    ctx,
    "supportContactConfirmationPerRecipient",
    { key: email, throws: false }
  );
  return acrossOrganizations.ok;
};

export const requestContactConfirmation = async (
  ctx: MutationCtx,
  args: { email: string; organizationId: Id<"organizations"> }
): Promise<{ confirmationRequired: boolean }> => {
  const email = normalizeEmail(args.email);
  const { organizationId } = args;
  const contact = await findSupportContact(ctx, organizationId, email);
  if (contact?.verifiedAt !== undefined) {
    return { confirmationRequired: false };
  }
  if (await repliesGoOutInFull(ctx, organizationId)) {
    return { confirmationRequired: false };
  }
  if (await isSupportRecipientSuppressed(ctx, email, organizationId)) {
    return { confirmationRequired: false };
  }
  const organization = await ctx.db.get(organizationId);
  if (!organization) {
    throw new Error("Organization not found");
  }
  if (!(await hasConfirmationEmailBudget(ctx, email, organizationId))) {
    return { confirmationRequired: true };
  }
  const { contactId, token } = await upsertPendingContact(ctx, {
    email,
    organizationId,
  });

  await ctx.db.patch(contactId, { verificationSentAt: Date.now() });
  await ctx.scheduler.runAfter(
    0,
    internal.support.email.render.sendContactConfirmation,
    {
      organizationId,
      organizationName: organization.name,
      to: email,
      token,
    }
  );
  return { confirmationRequired: true };
};

export const requestContactConfirmationOnce = async (
  ctx: MutationCtx,
  args: { email: string; organizationId: Id<"organizations"> }
): Promise<void> => {
  const contact = await findSupportContact(
    ctx,
    args.organizationId,
    args.email
  );
  if (contact?.verificationSentAt !== undefined) {
    return;
  }
  await requestContactConfirmation(ctx, args);
};

export const confirmContact = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const contact = await ctx.db
      .query("supportContacts")
      .withIndex("by_verification_token", (q) =>
        q.eq("verificationToken", args.token)
      )
      .unique();
    const organization = contact && (await ctx.db.get(contact.organizationId));
    if (!(contact && organization)) {
      throw new ConvexError(
        "This confirmation link is invalid or has expired."
      );
    }
    await ctx.db.patch(contact._id, {
      verificationToken: undefined,
      verifiedAt: Date.now(),
    });
    return { orgName: organization.name, orgSlug: organization.slug };
  },
  returns: v.object({ orgName: v.string(), orgSlug: v.string() }),
});

const threadRecipient = async (ctx: QueryCtx, token: string) => {
  const conversationId = await findConversationIdByThreadToken(ctx, token);
  const conversation = conversationId && (await ctx.db.get(conversationId));
  if (!conversation) {
    return null;
  }
  const recipient = await customerRecipient(ctx, conversation);
  return recipient
    ? { email: recipient.email, organizationId: conversation.organizationId }
    : null;
};

export const unsubscribeThread = async (
  ctx: MutationCtx,
  token: string
): Promise<boolean> => {
  const recipient = await threadRecipient(ctx, token);
  if (!recipient) {
    return false;
  }
  await addSuppressionOnce(ctx, {
    email: recipient.email,
    organizationId: recipient.organizationId,
    originalEventType: "unsubscribe",
    reason: "unsubscribed",
  });
  return true;
};

const resubscribeThread = async (ctx: MutationCtx, token: string) => {
  const recipient = await threadRecipient(ctx, token);
  if (!recipient) {
    return;
  }
  const rows = await ctx.db
    .query("emailSuppressions")
    .withIndex("by_email_org", (q) =>
      q
        .eq("email", recipient.email)
        .eq("organizationId", recipient.organizationId)
    )
    .collect();
  await Promise.all(
    rows
      .filter((row) => row.reason === "unsubscribed")
      .map((row) => ctx.db.delete(row._id))
  );
};

export const getThreadNotifications = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const recipient = await threadRecipient(ctx, args.token);
    if (!recipient) {
      return null;
    }
    const suppressed = await isSupportRecipientSuppressed(
      ctx,
      recipient.email,
      recipient.organizationId
    );
    return { email: recipient.email, enabled: !suppressed };
  },
  returns: v.union(
    v.object({ email: v.string(), enabled: v.boolean() }),
    v.null()
  ),
});

export const setThreadNotifications = mutation({
  args: { enabled: v.boolean(), token: v.string() },
  handler: async (ctx, args) => {
    if (args.enabled) {
      await resubscribeThread(ctx, args.token);
    } else {
      await unsubscribeThread(ctx, args.token);
    }
    return null;
  },
  returns: v.null(),
});
