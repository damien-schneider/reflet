import { type ObjectType, v } from "convex/values";
import type { Doc, Id } from "../../../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../../../_generated/server";
import { normalizeEmail } from "../../../email/suppression";
import { MAX_SUPPORT_SUBJECT_LENGTH } from "../../../shared/constants";
import { rateLimiter } from "../../../shared/rate_limits";
import {
  appendCustomerMessage,
  createCustomerConversation,
  newGuestCustomer,
} from "../../conversation_writes";
import { findConversationIdByThreadToken } from "../../thread_tokens";
import { SUPPORT_INBOUND_DOMAIN } from "../client";
import { markContactVerified } from "../contacts";
import { customerRecipient } from "../delivery_policy";
import { type InboundAttachment, inboundAttachment } from "./attachments";
import { type InboundRouteCandidate, routeInbound } from "./route";

const GMAIL_FORWARDING_SENDER = "forwarding-noreply@google.com";
const GMAIL_CONFIRMATION_URL_PATTERN =
  /https:\/\/(?:mail-settings\.google\.com|mail\.google\.com)\/[^\s<>"')\]]+/;
const GMAIL_EXCERPT_CHARS = 500;

const recordInboundArgs = {
  attachments: v.array(inboundAttachment),
  from: v.string(),
  fullText: v.string(),
  inboundEmailId: v.id("supportInboundEmails"),
  inReplyTo: v.optional(v.string()),
  isAutoSubmitted: v.boolean(),
  recipients: v.array(v.string()),
  references: v.array(v.string()),
  senderAuthenticated: v.boolean(),
  subject: v.string(),
  visibleText: v.string(),
};

type ParsedInbound = ObjectType<typeof recordInboundArgs>;

type InboundOutcome = Partial<
  Pick<
    Doc<"supportInboundEmails">,
    | "conversationId"
    | "messageId"
    | "organizationId"
    | "rejectReason"
    | "senderMismatch"
  >
> &
  Pick<Doc<"supportInboundEmails">, "status">;

type InboundTarget =
  | { conversation: Doc<"supportConversations">; kind: "thread" }
  | { kind: "alias"; settings: Doc<"supportEmailSettings"> };

const resolveTarget = async (
  ctx: MutationCtx,
  candidates: InboundRouteCandidate[]
): Promise<InboundTarget | null> => {
  for (const candidate of candidates) {
    if (candidate.kind === "thread") {
      const conversationId = await findConversationIdByThreadToken(
        ctx,
        candidate.token
      );
      const conversation = conversationId
        ? await ctx.db.get(conversationId)
        : null;
      if (conversation) {
        return { conversation, kind: "thread" };
      }
      continue;
    }
    const settings = await ctx.db
      .query("supportEmailSettings")
      .withIndex("by_inbound_alias", (q) =>
        q.eq("inboundAlias", candidate.alias)
      )
      .unique();
    if (settings) {
      return { kind: "alias", settings };
    }
  }
  return null;
};

const insertAttachments = async (
  ctx: MutationCtx,
  message: {
    conversationId: Id<"supportConversations">;
    messageId: Id<"supportMessages">;
  },
  attachments: InboundAttachment[]
): Promise<void> => {
  for (const attachment of attachments) {
    await ctx.db.insert("supportAttachments", { ...attachment, ...message });
  }
};

const discardStoredFiles = async (
  ctx: MutationCtx,
  attachments: InboundAttachment[]
): Promise<void> => {
  for (const { file } of attachments) {
    if (file.kind === "stored") {
      await ctx.storage.delete(file.storageId);
    }
  }
};

const recordThreadReply = async (
  ctx: MutationCtx,
  conversation: Doc<"supportConversations">,
  email: ParsedInbound
): Promise<InboundOutcome> => {
  const conversationId = conversation._id;
  const { organizationId } = conversation;
  const { ok } = await rateLimiter.limit(ctx, "supportInboundPerConversation", {
    key: conversationId,
  });
  if (!ok) {
    return {
      conversationId,
      organizationId,
      rejectReason: "rate_limited",
      status: "rejected",
    };
  }
  const messageId = await appendCustomerMessage(ctx, conversation, {
    body: email.visibleText,
    countsAsActivity: !email.isAutoSubmitted,
    inboundEmailId: email.inboundEmailId,
    now: Date.now(),
  });
  await insertAttachments(
    ctx,
    { conversationId, messageId },
    email.attachments
  );
  const recipient = await customerRecipient(ctx, conversation);
  const senderMismatch = recipient?.email !== normalizeEmail(email.from);
  if (email.senderAuthenticated && !senderMismatch) {
    await markContactVerified(ctx, { email: email.from, organizationId });
  }
  return {
    conversationId,
    messageId,
    organizationId,
    senderMismatch,
    status: "appended",
  };
};

const recordGmailConfirmation = async (
  ctx: MutationCtx,
  settings: Doc<"supportEmailSettings">,
  email: ParsedInbound
): Promise<InboundOutcome> => {
  await ctx.db.patch(settings._id, {
    gmailConfirmation: {
      confirmationUrl: GMAIL_CONFIRMATION_URL_PATTERN.exec(email.fullText)?.[0],
      excerpt: email.fullText.slice(0, GMAIL_EXCERPT_CHARS).trim(),
      receivedAt: Date.now(),
      subject: email.subject,
    },
  });
  return {
    organizationId: settings.organizationId,
    status: "forwarding_confirmation",
  };
};

const hasInboundConversationBudget = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  email: ParsedInbound
): Promise<boolean> => {
  if (email.senderAuthenticated) {
    const perSender = await rateLimiter.limit(
      ctx,
      "supportInboundNewConversationPerSender",
      { key: `${organizationId}:${normalizeEmail(email.from)}` }
    );
    if (!perSender.ok) {
      return false;
    }
  }
  const perOrganization = await rateLimiter.limit(
    ctx,
    "supportInboundNewConversationPerOrg",
    { key: organizationId }
  );
  return perOrganization.ok;
};

const recordNewConversation = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  email: ParsedInbound
): Promise<InboundOutcome> => {
  const organization = await ctx.db.get(organizationId);
  if (!organization?.supportEnabled) {
    return {
      organizationId,
      rejectReason: "support_disabled",
      status: "rejected",
    };
  }
  if (!(await hasInboundConversationBudget(ctx, organizationId, email))) {
    return { organizationId, rejectReason: "rate_limited", status: "rejected" };
  }
  const { conversationId, messageId } = await createCustomerConversation(ctx, {
    body: email.visibleText,
    customer: newGuestCustomer(normalizeEmail(email.from)),
    inboundEmailId: email.inboundEmailId,
    now: Date.now(),
    organizationId,
    subject: email.subject.slice(0, MAX_SUPPORT_SUBJECT_LENGTH),
  });
  await insertAttachments(
    ctx,
    { conversationId, messageId },
    email.attachments
  );
  if (email.senderAuthenticated) {
    await markContactVerified(ctx, { email: email.from, organizationId });
  }
  return { conversationId, messageId, organizationId, status: "created" };
};

const recordAliasEmail = async (
  ctx: MutationCtx,
  settings: Doc<"supportEmailSettings">,
  email: ParsedInbound
): Promise<InboundOutcome> => {
  if (normalizeEmail(email.from) === GMAIL_FORWARDING_SENDER) {
    if (!email.senderAuthenticated) {
      return {
        organizationId: settings.organizationId,
        rejectReason: "unauthenticated_sender",
        status: "rejected",
      };
    }
    return await recordGmailConfirmation(ctx, settings, email);
  }
  const testCode = settings.forwardingTestCode;
  if (
    testCode &&
    email.subject.includes(`[reflet-forwarding-test:${testCode}]`)
  ) {
    await ctx.db.patch(settings._id, {
      forwardingTestCode: undefined,
      forwardingVerifiedAt: Date.now(),
    });
    return {
      organizationId: settings.organizationId,
      status: "forwarding_verified",
    };
  }
  if (email.isAutoSubmitted) {
    return {
      organizationId: settings.organizationId,
      rejectReason: "auto_submitted",
      status: "rejected",
    };
  }
  return await recordNewConversation(ctx, settings.organizationId, email);
};

const recordRoutedEmail = async (
  ctx: MutationCtx,
  target: InboundTarget | null,
  email: ParsedInbound
): Promise<InboundOutcome> => {
  if (!target) {
    return { status: "unrouted" };
  }
  if (target.kind === "thread") {
    return await recordThreadReply(ctx, target.conversation, email);
  }
  return await recordAliasEmail(ctx, target.settings, email);
};

export const recordInbound = internalMutation({
  args: recordInboundArgs,
  handler: async (ctx, args) => {
    const inbound = await ctx.db.get(args.inboundEmailId);
    if (inbound?.status !== "pending") {
      await discardStoredFiles(ctx, args.attachments);
      return;
    }
    await ctx.db.patch(inbound._id, {
      fullText: args.fullText,
      isAutoSubmitted: args.isAutoSubmitted,
      senderAuthenticated: args.senderAuthenticated,
      subject: args.subject,
    });
    const target = await resolveTarget(
      ctx,
      routeInbound({
        inboundDomain: SUPPORT_INBOUND_DOMAIN,
        inReplyTo: args.inReplyTo,
        recipients: args.recipients,
        references: args.references,
      })
    );
    const outcome = await recordRoutedEmail(ctx, target, args);
    await ctx.db.patch(inbound._id, outcome);
    if (outcome.messageId === undefined) {
      await discardStoredFiles(ctx, args.attachments);
    }
  },
});

export const rejectInbound = internalMutation({
  args: {
    inboundEmailId: v.id("supportInboundEmails"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const inbound = await ctx.db.get(args.inboundEmailId);
    if (inbound?.status === "pending") {
      await ctx.db.patch(inbound._id, {
        rejectReason: args.reason,
        status: "rejected",
      });
    }
  },
});
