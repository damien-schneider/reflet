/// <reference types="vite/client" />

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import {
  scheduledFunctionNames,
  seedOrganization,
} from "../../../test.fixtures";
import { setupTest } from "../../../test.helpers";
import { ensureThreadToken } from "../../thread_tokens";

const ADMIN = { _id: "user_admin", email: "team@acme.test", name: "Sam" };
const GUEST = {
  credential: {
    guestId: "5f0c2f0e-8a1b-4c7d-9e2f-3a4b5c6d7e8f",
    kind: "guest",
  } as const,
  email: "jane@example.com",
};
const DELIVER_ADMIN_REPLY = "support/email/render:deliverAdminReply";
const SEND_CONFIRMATION = "support/email/render:sendContactConfirmation";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("RESEND_SUPPORT_API_KEY", "re_test");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

const setup = async () => {
  const t = setupTest({ authUsers: [ADMIN] });
  const organizationId = await t.run(async (ctx) => {
    const orgId = await seedOrganization(ctx, { supportEnabled: true });
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId: orgId,
      role: "owner",
      userId: ADMIN._id,
    });
    return orgId;
  });
  const admin = t.withIdentity({ sessionId: ADMIN._id, subject: ADMIN._id });

  const openGuestConversation = () =>
    t.mutation(api.support.conversations.create, {
      guestEmail: GUEST.email,
      guestId: GUEST.credential.guestId,
      initialMessage: "Checkout fails",
      organizationId,
    });

  const scheduled = () => t.run((ctx) => scheduledFunctionNames(ctx));

  const confirmGuest = () =>
    t.run(async (ctx) => {
      const contact = await ctx.db.query("supportContacts").unique();
      if (contact) {
        await ctx.db.patch(contact._id, { verifiedAt: Date.now() });
      }
    });

  const adminReply = (conversationId: Id<"supportConversations">) =>
    admin.mutation(api.support.messages.send, {
      body: "Fixed, try again",
      conversationId,
    });

  const sendNotice = (
    messageId: Id<"supportMessages"> | undefined,
    to = GUEST.email
  ) =>
    t.mutation(internal.support.email.outbound.sendSupportEmail, {
      emailType: "support_reply_notice",
      from: "Reflet <notifications@inbox.reflet.app>",
      html: "<p>New reply</p>",
      organizationId,
      reply: messageId
        ? { messageId, rfcMessageId: `<m.${messageId}@inbox.reflet.app>` }
        : undefined,
      subject: "New reply from Acme",
      text: "New reply",
      to,
    });

  return {
    adminReply,
    confirmGuest,
    openGuestConversation,
    organizationId,
    scheduled,
    sendNotice,
    t,
  };
};

describe("admin replies", () => {
  test("an admin reply schedules the customer email delivery", async () => {
    const { adminReply, openGuestConversation, scheduled } = await setup();
    const conversationId = await openGuestConversation();

    await adminReply(conversationId);

    expect(await scheduled()).toContain(DELIVER_ADMIN_REPLY);
  });

  test("delivering a reply to a confirmed contact sends a threaded notice", async () => {
    const { adminReply, confirmGuest, openGuestConversation, t } =
      await setup();
    const conversationId = await openGuestConversation();
    await confirmGuest();
    const messageId = await adminReply(conversationId);

    await t.action(internal.support.email.render.deliverAdminReply, {
      messageId,
    });

    const { message, token } = await t.run(async (ctx) => ({
      message: await ctx.db.get(messageId),
      token: (await ctx.db.query("supportThreadTokens").unique())?.token,
    }));
    expect(message?.outboundEmail).toMatchObject({
      mode: "notice",
      rfcMessageId: `<m.${messageId}.${token}@inbox.reflet.app>`,
      status: "sent",
    });
  });

  test("delivering a reply to an unconfirmed guest records why it was not emailed", async () => {
    const { adminReply, openGuestConversation, t } = await setup();
    const conversationId = await openGuestConversation();
    const messageId = await adminReply(conversationId);

    await t.action(internal.support.email.render.deliverAdminReply, {
      messageId,
    });

    const message = await t.run((ctx) => ctx.db.get(messageId));
    expect(message?.outboundEmail).toEqual({
      reason: "unverified_contact",
      status: "skipped",
    });
  });

  test("a confirmed contact gets one notice, a second reply within 30 minutes is not emailed", async () => {
    const { adminReply, confirmGuest, openGuestConversation, sendNotice, t } =
      await setup();
    const conversationId = await openGuestConversation();
    await confirmGuest();
    const first = await adminReply(conversationId);
    const second = await adminReply(conversationId);

    expect(await sendNotice(first)).toMatchObject({ status: "sent" });
    expect(await sendNotice(second)).toEqual({ status: "throttled" });

    const { messages, sendLogs, conversation } = await t.run(async (ctx) => ({
      conversation: await ctx.db.get(conversationId),
      messages: await Promise.all([ctx.db.get(first), ctx.db.get(second)]),
      sendLogs: await ctx.db.query("emailSendLog").collect(),
    }));
    expect(messages[0]?.outboundEmail).toMatchObject({
      mode: "notice",
      status: "sent",
    });
    expect(messages[1]?.outboundEmail).toBeUndefined();
    expect(conversation?.customerNoticeSentAt).toBeDefined();
    expect(sendLogs).toMatchObject([
      { emailType: "support_reply_notice", to: GUEST.email },
    ]);
  });

  test("a suppressed recipient is skipped and the message says why", async () => {
    const { adminReply, openGuestConversation, organizationId, sendNotice, t } =
      await setup();
    const conversationId = await openGuestConversation();
    const messageId = await adminReply(conversationId);
    await t.run((ctx) =>
      ctx.db.insert("emailSuppressions", {
        email: GUEST.email,
        organizationId,
        originalEventType: "unsubscribe",
        reason: "unsubscribed",
        suppressedAt: Date.now(),
      })
    );

    expect(await sendNotice(messageId)).toEqual({
      reason: "suppressed",
      status: "skipped",
    });
    const message = await t.run((ctx) => ctx.db.get(messageId));
    expect(message?.outboundEmail).toEqual({
      reason: "suppressed",
      status: "skipped",
    });
  });

  test("a paused organization sends nothing", async () => {
    const { adminReply, openGuestConversation, organizationId, sendNotice, t } =
      await setup();
    const conversationId = await openGuestConversation();
    const messageId = await adminReply(conversationId);
    await t.run((ctx) =>
      ctx.db.insert("supportEmailSettings", {
        createdAt: Date.now(),
        organizationId,
        sendingPausedAt: Date.now(),
        sendingPauseReason: "complaint_rate",
      })
    );

    expect(await sendNotice(messageId)).toEqual({
      reason: "paused",
      status: "skipped",
    });
    expect(
      await t.run((ctx) => ctx.db.query("emailSendLog").collect())
    ).toEqual([]);
  });

  test("notices to one recipient stop once the daily allowance is spent", async () => {
    const { sendNotice } = await setup();

    const statuses: string[] = [];
    for (let attempt = 0; attempt < 11; attempt += 1) {
      statuses.push((await sendNotice(undefined)).status);
    }

    expect(statuses).toEqual([
      ...Array.from({ length: 10 }, () => "sent"),
      "skipped",
    ]);
    expect(await sendNotice(undefined)).toEqual({
      reason: "rate_limited",
      status: "skipped",
    });
  });
});

describe("contact confirmation", () => {
  test("a guest conversation asks once for confirmation, follow-ups do not ask again", async () => {
    const { openGuestConversation, scheduled, t } = await setup();
    const conversationId = await openGuestConversation();

    await t.mutation(api.support.messages.send, {
      body: "Any news?",
      conversationId,
      credential: GUEST.credential,
    });

    expect(
      (await scheduled()).filter((name) => name === SEND_CONFIRMATION)
    ).toHaveLength(1);
    const contact = await t.run((ctx) =>
      ctx.db.query("supportContacts").unique()
    );
    expect(contact).toMatchObject({ email: GUEST.email });
    expect(contact?.verificationSentAt).toBeDefined();
  });

  test("an already confirmed contact is not asked again", async () => {
    const { organizationId, openGuestConversation, scheduled, t } =
      await setup();
    await t.run((ctx) =>
      ctx.db.insert("supportContacts", {
        createdAt: Date.now(),
        email: GUEST.email,
        organizationId,
        verifiedAt: Date.now(),
      })
    );

    await openGuestConversation();

    expect(await scheduled()).not.toContain(SEND_CONFIRMATION);
  });

  test("a suppressed address is not asked for confirmation", async () => {
    const { openGuestConversation, scheduled, t } = await setup();
    await t.run((ctx) =>
      ctx.db.insert("emailSuppressions", {
        email: GUEST.email,
        originalEventType: "email.bounced",
        reason: "hard_bounce",
        suppressedAt: Date.now(),
      })
    );

    await openGuestConversation();

    expect(await scheduled()).not.toContain(SEND_CONFIRMATION);
  });

  test("the confirmation link verifies the contact once", async () => {
    const { openGuestConversation, t } = await setup();
    await openGuestConversation();
    const token = await t.run(
      async (ctx) =>
        (await ctx.db.query("supportContacts").unique())?.verificationToken
    );

    expect(
      await t.mutation(api.support.email.contacts.confirmContact, {
        token: token ?? "",
      })
    ).toEqual({ orgName: "Acme", orgSlug: "acme" });
    const contact = await t.run((ctx) =>
      ctx.db.query("supportContacts").unique()
    );
    expect(contact?.verifiedAt).toBeDefined();
    expect(contact?.verificationToken).toBeUndefined();

    await expect(
      t.mutation(api.support.email.contacts.confirmContact, {
        token: token ?? "",
      })
    ).rejects.toThrow("invalid or has expired");
  });
});

describe("thread notifications", () => {
  test("turning notifications off suppresses only this organization", async () => {
    const { openGuestConversation, organizationId, t } = await setup();
    const conversationId = await openGuestConversation();
    const token = await t.run((ctx) => ensureThreadToken(ctx, conversationId));

    await t.mutation(api.support.email.contacts.setThreadNotifications, {
      enabled: false,
      token,
    });

    expect(
      await t.query(api.support.email.contacts.getThreadNotifications, {
        token,
      })
    ).toEqual({ email: GUEST.email, enabled: false });
    const suppressions = await t.run((ctx) =>
      ctx.db.query("emailSuppressions").collect()
    );
    expect(suppressions).toMatchObject([
      { email: GUEST.email, organizationId, reason: "unsubscribed" },
    ]);

    await t.mutation(api.support.email.contacts.setThreadNotifications, {
      enabled: true,
      token,
    });

    expect(
      await t.query(api.support.email.contacts.getThreadNotifications, {
        token,
      })
    ).toEqual({ email: GUEST.email, enabled: true });
  });

  test("an unknown thread token has no notification settings", async () => {
    const { t } = await setup();

    expect(
      await t.query(api.support.email.contacts.getThreadNotifications, {
        token: "nope",
      })
    ).toBeNull();
  });
});
