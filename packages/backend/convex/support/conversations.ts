import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { normalizeEmail } from "../email/suppression";
import { MAX_SUPPORT_SUBJECT_LENGTH } from "../shared/constants";
import { rateLimiter } from "../shared/rate_limits";
import { isValidEmail, validateInputLength } from "../shared/validators";
import { resolveConversationAccess, supportCredential } from "./access";
import {
  type ConversationCustomer,
  createCustomerConversation,
  requireMessageBody,
} from "./conversation_writes";
import { requestContactConfirmation } from "./email/contacts";
import {
  type CustomerDelivery,
  resolveCustomerDelivery,
} from "./email/delivery_policy";
import { resolveAssignedUser, resolveConversationPerson } from "./people";
import {
  type SupportConversationDetail,
  type SupportEmailChannel,
  supportConversationDetail,
  supportConversationDoc,
} from "./validators";

const toEmailChannel = (delivery: CustomerDelivery): SupportEmailChannel => {
  switch (delivery.kind) {
    case "full":
      return { from: delivery.from, kind: "full" };
    case "notice":
      return { kind: "notice" };
    default:
      return delivery;
  }
};

const byMostRecent = (
  a: { lastMessageAt: number },
  b: { lastMessageAt: number }
) => b.lastMessageAt - a.lastMessageAt;

const GUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const listForUser = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    const conversations = await ctx.db
      .query("supportConversations")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .collect();

    return conversations.filter((c) => !c.guestId).sort(byMostRecent);
  },
  returns: v.array(supportConversationDoc),
});

export const listForGuest = query({
  args: {
    guestId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const conversations = await ctx.db
      .query("supportConversations")
      .withIndex("by_guest", (q) => q.eq("guestId", args.guestId))
      .collect();

    return conversations
      .filter((c) => c.organizationId === args.organizationId)
      .sort(byMostRecent);
  },
  returns: v.array(supportConversationDoc),
});

export const getUnreadCountForUser = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return 0;
    }

    const conversations = await ctx.db
      .query("supportConversations")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .collect();

    return conversations
      .filter((c) => !c.guestId)
      .reduce((acc, conv) => acc + conv.userUnreadCount, 0);
  },
  returns: v.number(),
});

export const get = query({
  args: {
    credential: v.optional(supportCredential),
    id: v.id("supportConversations"),
  },
  handler: async (ctx, args): Promise<SupportConversationDetail | null> => {
    const conversation = await ctx.db.get(args.id);
    if (!conversation) {
      return null;
    }

    const access = await resolveConversationAccess(
      ctx,
      conversation,
      args.credential
    );
    if (!access) {
      return null;
    }

    const user = await resolveConversationPerson(ctx, conversation);
    if (!access.isAdmin) {
      const {
        guestId: _guestId,
        userId: _userId,
        ...customerView
      } = conversation;
      return { ...customerView, isAdmin: false, user };
    }
    return {
      ...conversation,
      assignedUser: await resolveAssignedUser(ctx, conversation.assignedTo),
      emailChannel: toEmailChannel(
        await resolveCustomerDelivery(ctx, conversation)
      ),
      isAdmin: true,
      user,
    };
  },
  returns: v.union(supportConversationDetail, v.null()),
});
export const create = mutation({
  args: {
    guestEmail: v.optional(v.string()),
    guestId: v.optional(v.string()),
    initialMessage: v.string(),
    organizationId: v.id("organizations"),
    subject: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    const customer = resolveNewConversationCustomer(user?._id, args);

    const body = requireMessageBody(args.initialMessage);
    validateInputLength(args.subject, MAX_SUPPORT_SUBJECT_LENGTH, "Subject");

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }
    if (!org.supportEnabled) {
      throw new ConvexError("Support is not enabled for this organization.");
    }

    await rateLimiter.limit(ctx, "supportConversationPerOrg", {
      key: args.organizationId,
      throws: true,
    });
    if (customer.kind === "guest" && customer.guestEmail) {
      await rateLimiter.limit(ctx, "supportConversationPerGuestEmail", {
        key: `${args.organizationId}:${normalizeEmail(customer.guestEmail)}`,
        throws: true,
      });
    }

    const { conversationId } = await createCustomerConversation(ctx, {
      body,
      customer,
      now: Date.now(),
      organizationId: args.organizationId,
      subject: args.subject,
    });
    if (customer.kind === "guest" && customer.guestEmail) {
      await requestContactConfirmation(ctx, {
        email: customer.guestEmail,
        organizationId: args.organizationId,
      });
    }

    return conversationId;
  },
  returns: v.id("supportConversations"),
});

const resolveNewConversationCustomer = (
  userId: string | undefined,
  args: { guestEmail?: string; guestId?: string }
): ConversationCustomer => {
  if (userId) {
    return { kind: "user", userId };
  }
  if (!(args.guestEmail && isValidEmail(args.guestEmail))) {
    throw new ConvexError("Enter a valid email address.");
  }
  if (!(args.guestId && GUEST_ID_PATTERN.test(args.guestId))) {
    throw new Error("Invalid guest session");
  }
  return { guestEmail: args.guestEmail, guestId: args.guestId, kind: "guest" };
};
