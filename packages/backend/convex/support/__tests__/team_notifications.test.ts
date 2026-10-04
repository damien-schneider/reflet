/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const OWNER = { _id: "user_owner", email: "owner@acme.dev" };
const ADMIN = { _id: "user_admin", email: "admin@acme.dev" };
const MEMBER = { _id: "user_member", email: "member@acme.dev" };
const GUEST = {
  email: "guest@example.com",
  id: "5f0c2f0e-8a1b-4c7d-9e2f-3a4b5c6d7e8f",
};
const GUEST_CREDENTIAL = { guestId: GUEST.id, kind: "guest" } as const;
const PUSH = "notifications/push:sendPushNotification";
const INBOX_ALERT = "support/email/inbox_alert:send";

const setup = async (options: { pro?: boolean } = {}) => {
  const t = setupTest({
    authUsers: [OWNER, ADMIN, MEMBER],
    stripeSubscriptionStatus: options.pro ? "active" : null,
  });
  const organizationId = await t.run(async (ctx) => {
    const orgId = await seedOrganization(ctx, { supportEnabled: true });
    for (const [user, role] of [
      [OWNER, "owner"],
      [ADMIN, "admin"],
      [MEMBER, "member"],
    ] as const) {
      await ctx.db.insert("organizationMembers", {
        createdAt: Date.now(),
        organizationId: orgId,
        role,
        userId: user._id,
      });
    }
    return orgId;
  });
  const as = (user: { _id: string }) =>
    t.withIdentity({ sessionId: user._id, subject: user._id });

  const openGuestConversation = () =>
    t.mutation(api.support.conversations.create, {
      guestEmail: GUEST.email,
      guestId: GUEST.id,
      initialMessage: "My export is broken",
      organizationId,
    });

  const sendAsGuest = (conversationId: Id<"supportConversations">) =>
    t.mutation(api.support.messages.send, {
      body: "Any news?",
      conversationId,
      credential: GUEST_CREDENTIAL,
    });

  const inAppRecipients = async () => {
    const notifications = await t.run((ctx) =>
      ctx.db.query("notifications").collect()
    );
    return notifications
      .filter((notification) => notification.type === "support_inbox_message")
      .map((notification) => notification.userId)
      .sort();
  };

  const scheduledArgs = async (name: string) => {
    const jobs = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect()
    );
    return jobs
      .filter((job) => job.name === name)
      .map((job) => job.args[0] as { to?: string; userId?: string });
  };

  const alertedEmails = async () =>
    (await scheduledArgs(INBOX_ALERT)).map((args) => args.to).sort();

  return {
    alertedEmails,
    as,
    inAppRecipients,
    openGuestConversation,
    organizationId,
    scheduledArgs,
    sendAsGuest,
    t,
  };
};

describe("team notifications for customer messages", () => {
  test("an unassigned conversation notifies every admin and owner, not members", async () => {
    const {
      alertedEmails,
      inAppRecipients,
      openGuestConversation,
      scheduledArgs,
    } = await setup();

    await openGuestConversation();

    expect(await inAppRecipients()).toEqual([ADMIN._id, OWNER._id]);
    expect(
      (await scheduledArgs(PUSH)).map((args) => args.userId).sort()
    ).toEqual([ADMIN._id, OWNER._id]);
    expect(await alertedEmails()).toEqual([ADMIN.email, OWNER.email]);
  });

  test("an assigned conversation notifies only the assignee, emailing once per unread burst", async () => {
    const {
      alertedEmails,
      as,
      inAppRecipients,
      openGuestConversation,
      sendAsGuest,
      t,
    } = await setup();
    const conversationId = await openGuestConversation();
    await t.run((ctx) =>
      ctx.db.patch(conversationId, { assignedTo: ADMIN._id })
    );

    await sendAsGuest(conversationId);

    expect(await inAppRecipients()).toEqual([ADMIN._id, ADMIN._id, OWNER._id]);
    expect(await alertedEmails()).toEqual([ADMIN.email, OWNER.email]);

    await as(ADMIN).mutation(api.support.messages.markAsRead, {
      conversationId,
    });
    await sendAsGuest(conversationId);

    expect(await alertedEmails()).toEqual([
      ADMIN.email,
      ADMIN.email,
      OWNER.email,
    ]);
  });

  test("turning off inbox emails keeps the in-app notification", async () => {
    const { alertedEmails, inAppRecipients, openGuestConversation, t } =
      await setup();
    await t.run((ctx) =>
      ctx.db.insert("userNotificationPreferences", {
        createdAt: Date.now(),
        emailOnInboxMessage: false,
        notifyOnInvitation: true,
        notifyOnNewComment: true,
        notifyOnNewSupportMessage: true,
        notifyOnStatusChange: true,
        notifyOnVoteMilestone: true,
        pushEnabled: true,
        pushPromptDismissed: false,
        updatedAt: Date.now(),
        userId: OWNER._id,
      })
    );

    await openGuestConversation();

    expect(await inAppRecipients()).toEqual([ADMIN._id, OWNER._id]);
    expect(await alertedEmails()).toEqual([ADMIN.email]);
  });
});

describe("admin view of the email channel", () => {
  test("a confirmed guest on a free plan is reached by a notice, which only admins see", async () => {
    const { as, openGuestConversation, organizationId, t } = await setup();
    const conversationId = await openGuestConversation();
    await t.run(async (ctx) => {
      const contact = await ctx.db
        .query("supportContacts")
        .withIndex("by_org_email", (q) =>
          q.eq("organizationId", organizationId).eq("email", GUEST.email)
        )
        .unique();
      if (!contact) {
        throw new Error("Guest contact was not recorded");
      }
      await ctx.db.patch(contact._id, { verifiedAt: Date.now() });
    });

    const adminView = await as(ADMIN).query(api.support.conversations.get, {
      id: conversationId,
    });
    expect(adminView?.emailChannel).toEqual({ kind: "notice" });

    const guestView = await t.query(api.support.conversations.get, {
      credential: GUEST_CREDENTIAL,
      id: conversationId,
    });
    expect(guestView?.emailChannel).toBeUndefined();
  });

  test("messages expose attachments to everyone and email delivery to admins only", async () => {
    const { as, openGuestConversation, t } = await setup();
    const conversationId = await openGuestConversation();
    const replyId = await as(ADMIN).mutation(api.support.messages.send, {
      body: "Looking into it",
      conversationId,
    });
    await t.run(async (ctx) => {
      await ctx.db.patch(replyId, {
        outboundEmail: { reason: "suppressed", status: "skipped" },
      });
      await ctx.db.insert("supportAttachments", {
        contentType: "application/zip",
        conversationId,
        file: { kind: "skipped", reason: "unsupported_type" },
        filename: "logs.zip",
        messageId: replyId,
        size: 2048,
      });
    });

    const adminReply = (
      await as(ADMIN).query(api.support.messages.list, { conversationId })
    ).find((message) => message._id === replyId);
    expect(adminReply?.email).toEqual({
      direction: "skipped",
      reason: "suppressed",
    });

    const guestReply = (
      await t.query(api.support.messages.list, {
        conversationId,
        credential: GUEST_CREDENTIAL,
      })
    ).find((message) => message._id === replyId);
    expect(guestReply?.email).toBeUndefined();
    expect(guestReply?.attachments).toEqual([
      {
        contentType: "application/zip",
        filename: "logs.zip",
        skipped: "unsupported_type",
        url: null,
      },
    ]);
  });
});

describe("starting an email conversation", () => {
  const draft = {
    body: "Following up on your trial",
    subject: "Your trial",
    to: "Lead@Example.com",
  };

  test("a free organization is told it is a Pro feature", async () => {
    const { as, organizationId } = await setup();

    await expect(
      as(ADMIN).mutation(api.support.email.compose.startEmailConversation, {
        ...draft,
        organizationId,
      })
    ).rejects.toThrow("Pro feature");
  });

  test("a Pro organization without a verified domain is sent to settings", async () => {
    const { as, organizationId } = await setup({ pro: true });

    await expect(
      as(ADMIN).mutation(api.support.email.compose.startEmailConversation, {
        ...draft,
        organizationId,
      })
    ).rejects.toThrow("Verify a sending domain");
  });

  test("a Pro organization with a verified domain opens a conversation awaiting the customer", async () => {
    const { as, organizationId, t } = await setup({ pro: true });
    await t.run((ctx) =>
      ctx.db.insert("supportSendingDomains", {
        createdAt: Date.now(),
        domain: "support.acme.dev",
        fromLocalPart: "help",
        lastCheckedAt: Date.now(),
        organizationId,
        records: [],
        resendDomainId: "domain_1",
        status: "verified",
      })
    );

    const conversationId = await as(ADMIN).mutation(
      api.support.email.compose.startEmailConversation,
      { ...draft, organizationId }
    );

    const conversation = await as(ADMIN).query(api.support.conversations.get, {
      id: conversationId,
    });
    expect(conversation).toMatchObject({
      adminUnreadCount: 0,
      emailChannel: { from: "help@support.acme.dev", kind: "full" },
      guestEmail: "lead@example.com",
      status: "awaiting_reply",
      subject: "Your trial",
      userUnreadCount: 1,
    });
    const messages = await as(ADMIN).query(api.support.messages.list, {
      conversationId,
    });
    expect(
      messages.map((message) => [message.senderType, message.body])
    ).toEqual([["admin", draft.body]]);
  });

  test("a member who is not an admin cannot start one", async () => {
    const { as, organizationId } = await setup({ pro: true });

    await expect(
      as(MEMBER).mutation(api.support.email.compose.startEmailConversation, {
        ...draft,
        organizationId,
      })
    ).rejects.toThrow("Only admins");
  });
});
