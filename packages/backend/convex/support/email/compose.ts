import { ConvexError, type Infer, v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import {
  isSupportRecipientSuppressed,
  normalizeEmail,
} from "../../email/suppression";
import { requireOrgAdmin } from "../../shared/access";
import {
  MAX_EMAIL_LENGTH,
  MAX_SUPPORT_SUBJECT_LENGTH,
} from "../../shared/constants";
import { rateLimiter } from "../../shared/rate_limits";
import { isValidEmail, validateInputLength } from "../../shared/validators";
import { isOrgAdminViewer } from "../access";
import { customerSenderId, requireMessageBody } from "../conversation_writes";
import { scheduleCustomerDelivery } from "../customer_delivery";
import { buildMessagePreview } from "../validators";
import {
  chooseCustomerDelivery,
  loadOrgSendingState,
  type OrgSendingState,
} from "./delivery_policy";
import { sendingPauseReason } from "./tableFields";

const composeBlocker = v.union(
  v.literal("paused"),
  v.literal("not_pro"),
  v.literal("no_verified_domain")
);

export type ComposeBlocker = Infer<typeof composeBlocker>;

const COMPOSE_BLOCKER_MESSAGES: Record<ComposeBlocker, string> = {
  no_verified_domain:
    "Verify a sending domain in Settings → Support email before starting an email conversation.",
  not_pro: "Starting email conversations is a Pro feature.",
  paused: "Email sending is paused for your organization.",
};

const findComposeBlocker = (
  sending: OrgSendingState
): ComposeBlocker | null => {
  if (sending.paused) {
    return "paused";
  }
  if (!sending.isPro) {
    return "not_pro";
  }
  if (sending.domain?.status !== "verified") {
    return "no_verified_domain";
  }
  return null;
};

export const getOutboundStatus = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    if (!(await isOrgAdminViewer(ctx, args.organizationId))) {
      return null;
    }
    const sending = await loadOrgSendingState(ctx, args.organizationId);
    return {
      composeBlocker: findComposeBlocker(sending),
      pauseReason: sending.pauseReason,
    };
  },
  returns: v.union(
    v.object({
      composeBlocker: v.union(composeBlocker, v.null()),
      pauseReason: v.optional(sendingPauseReason),
    }),
    v.null()
  ),
});

export const startEmailConversation = mutation({
  args: {
    body: v.string(),
    organizationId: v.id("organizations"),
    subject: v.string(),
    to: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId } = args;
    const { user } = await requireOrgAdmin(
      ctx,
      organizationId,
      "start email conversations"
    );

    const to = normalizeEmail(args.to);
    if (to.length > MAX_EMAIL_LENGTH || !isValidEmail(to)) {
      throw new ConvexError("Enter a valid email address.");
    }
    const subject = args.subject.trim();
    if (!subject) {
      throw new ConvexError("Add a subject.");
    }
    validateInputLength(subject, MAX_SUPPORT_SUBJECT_LENGTH, "Subject");
    const body = requireMessageBody(args.body);

    const sending = await loadOrgSendingState(ctx, organizationId);
    const blocker = findComposeBlocker(sending);
    if (blocker) {
      throw new ConvexError(COMPOSE_BLOCKER_MESSAGES[blocker]);
    }
    const delivery = chooseCustomerDelivery({
      domain: sending.domain,
      isPro: sending.isPro,
      paused: sending.paused,
      recipient: { email: to, verified: false },
      suppressed: await isSupportRecipientSuppressed(ctx, to, organizationId),
    });
    if (delivery.kind !== "full") {
      throw new ConvexError(
        `${to} bounced or unsubscribed, so it can't receive email from your team.`
      );
    }

    await rateLimiter.limit(ctx, "supportOutboundConversationPerOrg", {
      key: organizationId,
      throws: true,
    });

    const now = Date.now();
    const guestId = crypto.randomUUID();
    const conversationId = await ctx.db.insert("supportConversations", {
      adminUnreadCount: 0,
      createdAt: now,
      guestEmail: to,
      guestId,
      lastMessageAt: now,
      lastMessagePreview: buildMessagePreview(body),
      organizationId,
      status: "awaiting_reply",
      subject,
      updatedAt: now,
      userId: customerSenderId({ guestEmail: to, guestId, kind: "guest" }),
      userUnreadCount: 1,
    });
    const messageId = await ctx.db.insert("supportMessages", {
      body,
      conversationId,
      createdAt: now,
      isRead: false,
      senderId: user._id,
      senderType: "admin",
    });

    const conversation = await ctx.db.get(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    await scheduleCustomerDelivery(ctx, conversation, messageId);

    return conversationId;
  },
  returns: v.id("supportConversations"),
});
