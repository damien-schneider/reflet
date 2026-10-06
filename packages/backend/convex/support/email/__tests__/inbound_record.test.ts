/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { internal } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import { seedOrganization } from "../../../test.fixtures";
import { setupTest } from "../../../test.helpers";

const OWNER = { _id: "user_owner", email: "owner@acme.dev" };
const CUSTOMER_EMAIL = "ana@customer.app";
const ALIAS = "acme-1a2b";
const THREAD_TOKEN = "0123456789abcdef0123456789abcdef";
const TEST_CODE = "c0ffee42";

const setup = async (options: { supportEnabled?: boolean } = {}) => {
  const t = setupTest({ authUsers: [OWNER] });
  const { conversationId, organizationId } = await t.run(async (ctx) => {
    const orgId = await seedOrganization(ctx, {
      supportEnabled: options.supportEnabled ?? true,
    });
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId: orgId,
      role: "owner",
      userId: OWNER._id,
    });
    await ctx.db.insert("supportEmailSettings", {
      createdAt: Date.now(),
      forwardingTestCode: TEST_CODE,
      inboundAlias: ALIAS,
      organizationId: orgId,
    });
    const guestId = crypto.randomUUID();
    const threadId = await ctx.db.insert("supportConversations", {
      adminUnreadCount: 0,
      createdAt: Date.now(),
      guestEmail: CUSTOMER_EMAIL,
      guestId,
      lastMessageAt: Date.now(),
      organizationId: orgId,
      status: "resolved",
      updatedAt: Date.now(),
      userId: `guest:${guestId}`,
      userUnreadCount: 0,
    });
    await ctx.db.insert("supportThreadTokens", {
      conversationId: threadId,
      token: THREAD_TOKEN,
    });
    return { conversationId: threadId, organizationId: orgId };
  });

  const receive = async (email: {
    attachments?: {
      contentType: string;
      file:
        | { kind: "stored"; storageId: Id<"_storage"> }
        | { kind: "skipped"; reason: "unsupported_type" };
      filename: string;
      size: number;
    }[];
    from?: string;
    fullText?: string;
    isAutoSubmitted?: boolean;
    recipients: string[];
    senderAuthenticated?: boolean;
    subject?: string;
  }) => {
    const from = email.from ?? CUSTOMER_EMAIL;
    const subject = email.subject ?? "Export is broken";
    const inboundEmailId = await t.run((ctx) =>
      ctx.db.insert("supportInboundEmails", {
        from,
        receivedAt: Date.now(),
        resendEmailId: crypto.randomUUID(),
        status: "pending",
        subject,
        to: email.recipients,
      })
    );
    const fullText = email.fullText ?? "Still broken on Safari.";
    await t.mutation(internal.support.email.inbound.record.recordInbound, {
      attachments: email.attachments ?? [],
      from,
      fullText,
      inboundEmailId,
      isAutoSubmitted: email.isAutoSubmitted ?? false,
      recipients: email.recipients,
      references: [],
      senderAuthenticated: email.senderAuthenticated ?? false,
      subject,
      visibleText: fullText,
    });
    return await t.run(async (ctx) => {
      const inbound = await ctx.db.get(inboundEmailId);
      if (!inbound) {
        throw new Error("inbound row missing");
      }
      return inbound;
    });
  };

  const notificationCount = async () =>
    (await t.run((ctx) => ctx.db.query("notifications").collect())).length;

  return { conversationId, notificationCount, organizationId, receive, t };
};

const THREAD_ADDRESS = `r+${THREAD_TOKEN}@inbox.reflet.app`;
const ALIAS_ADDRESS = `${ALIAS}@inbox.reflet.app`;

describe("recordInbound", () => {
  test("a reply on a thread token reopens the conversation and notifies the team", async () => {
    const { conversationId, notificationCount, receive, t } = await setup();

    const inbound = await receive({ recipients: [THREAD_ADDRESS] });

    expect(inbound.status).toBe("appended");
    expect(inbound.senderMismatch).toBe(false);
    const { conversation, messages } = await t.run(async (ctx) => ({
      conversation: await ctx.db.get(conversationId),
      messages: await ctx.db
        .query("supportMessages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversationId)
        )
        .collect(),
    }));
    expect(conversation?.status).toBe("open");
    expect(conversation?.adminUnreadCount).toBe(1);
    expect(messages.map((message) => message.body)).toEqual([
      "Still broken on Safari.",
    ]);
    expect(messages[0]?.inboundEmailId).toBe(inbound._id);
    expect(inbound.messageId).toBe(messages[0]?._id);
    expect(await notificationCount()).toBe(1);
  });

  test("an automatic reply is stored without reopening or notifying", async () => {
    const { conversationId, notificationCount, receive, t } = await setup();

    const inbound = await receive({
      isAutoSubmitted: true,
      recipients: [THREAD_ADDRESS],
    });

    expect(inbound.status).toBe("appended");
    const conversation = await t.run((ctx) => ctx.db.get(conversationId));
    expect(conversation?.status).toBe("resolved");
    expect(conversation?.adminUnreadCount).toBe(0);
    expect(await notificationCount()).toBe(0);
  });

  test("a reply from another address is accepted and flagged", async () => {
    const { receive } = await setup();

    const inbound = await receive({
      from: "someone.else@example.com",
      recipients: [THREAD_ADDRESS],
      senderAuthenticated: true,
    });

    expect(inbound.status).toBe("appended");
    expect(inbound.senderMismatch).toBe(true);
  });

  test("an authenticated reply from the customer verifies their address", async () => {
    const { organizationId, receive, t } = await setup();

    await receive({ recipients: [THREAD_ADDRESS], senderAuthenticated: true });

    const contacts = await t.run((ctx) =>
      ctx.db.query("supportContacts").collect()
    );
    expect(
      contacts.map(({ email, verifiedAt }) => ({
        email,
        verified: verifiedAt !== undefined,
      }))
    ).toEqual([{ email: CUSTOMER_EMAIL, verified: true }]);
    expect(contacts[0]?.organizationId).toBe(organizationId);
  });

  test("an email to the org alias opens a guest conversation with its attachments", async () => {
    const { organizationId, receive, t } = await setup();

    const inbound = await receive({
      attachments: [
        {
          contentType: "application/zip",
          file: { kind: "skipped", reason: "unsupported_type" },
          filename: "logs.zip",
          size: 2048,
        },
      ],
      from: "new.customer@example.com",
      recipients: ["support@acme.com", ALIAS_ADDRESS],
      subject: "Cannot log in",
    });

    expect(inbound.status).toBe("created");
    const { attachments, conversation } = await t.run(async (ctx) => ({
      attachments: await ctx.db.query("supportAttachments").collect(),
      conversation: inbound.conversationId
        ? await ctx.db.get(inbound.conversationId)
        : null,
    }));
    expect(conversation).toMatchObject({
      guestEmail: "new.customer@example.com",
      organizationId,
      status: "open",
      subject: "Cannot log in",
    });
    expect(
      attachments.map(({ filename, messageId }) => ({ filename, messageId }))
    ).toEqual([{ filename: "logs.zip", messageId: inbound.messageId }]);
  });

  test("an email to the alias of an org with support disabled is rejected", async () => {
    const { receive, t } = await setup({ supportEnabled: false });

    const inbound = await receive({
      from: "new.customer@example.com",
      recipients: [ALIAS_ADDRESS],
    });

    expect(inbound).toMatchObject({
      rejectReason: "support_disabled",
      status: "rejected",
    });
    const conversations = await t.run((ctx) =>
      ctx.db.query("supportConversations").collect()
    );
    expect(conversations).toHaveLength(1);
  });

  test("an automatic email to the alias is rejected without opening a conversation", async () => {
    const { receive, t } = await setup();
    const storageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["%PDF-1.7"], { type: "application/pdf" }))
    );

    const inbound = await receive({
      attachments: [
        {
          contentType: "application/pdf",
          file: { kind: "stored", storageId },
          filename: "alert.pdf",
          size: 8,
        },
      ],
      from: "notifications@mail.reflet.app",
      isAutoSubmitted: true,
      recipients: [ALIAS_ADDRESS],
      subject: "Nouveau message de Ana",
    });

    expect(inbound).toMatchObject({
      rejectReason: "auto_submitted",
      status: "rejected",
    });
    const conversations = await t.run((ctx) =>
      ctx.db.query("supportConversations").collect()
    );
    expect(conversations).toHaveLength(1);
    expect(await t.run((ctx) => ctx.storage.getUrl(storageId))).toBeNull();
  });

  test("an unrouted email discards its stored attachments", async () => {
    const { receive, t } = await setup();
    const storageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["%PDF-1.7"], { type: "application/pdf" }))
    );

    const inbound = await receive({
      attachments: [
        {
          contentType: "application/pdf",
          file: { kind: "stored", storageId },
          filename: "invoice.pdf",
          size: 8,
        },
      ],
      recipients: ["unknown@inbox.reflet.app"],
    });

    expect(inbound.status).toBe("unrouted");
    expect(await t.run((ctx) => ctx.storage.getUrl(storageId))).toBeNull();
  });

  test("a spoofed Gmail forwarding confirmation is rejected", async () => {
    const { organizationId, receive, t } = await setup();

    const inbound = await receive({
      from: "forwarding-noreply@google.com",
      fullText: "Click https://mail-settings.google.com/mail/vf-evil to allow.",
      recipients: [ALIAS_ADDRESS],
      senderAuthenticated: false,
      subject: "(#1) Gmail Forwarding Confirmation",
    });

    expect(inbound).toMatchObject({
      rejectReason: "unauthenticated_sender",
      status: "rejected",
    });
    const settings = await t.run((ctx) =>
      ctx.db
        .query("supportEmailSettings")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId)
        )
        .unique()
    );
    expect(settings?.gmailConfirmation).toBeUndefined();
  });

  test("spoofed senders do not use up the real sender's conversation budget", async () => {
    const { receive } = await setup();
    const spoofed = { from: "victim@example.com", recipients: [ALIAS_ADDRESS] };

    for (let attempt = 0; attempt < 6; attempt++) {
      expect((await receive(spoofed)).status).toBe("created");
    }

    const genuine = await receive({ ...spoofed, senderAuthenticated: true });
    expect(genuine.status).toBe("created");
  });

  test("captures the Gmail forwarding confirmation on the alias", async () => {
    const { organizationId, receive, t } = await setup();

    const inbound = await receive({
      from: "forwarding-noreply@google.com",
      fullText:
        "damien@gmail.com has requested to automatically forward mail.\nTo allow, click https://mail-settings.google.com/mail/vf-%5BABC%5D-123 to confirm.",
      recipients: [ALIAS_ADDRESS],
      senderAuthenticated: true,
      subject: "(#123456) Gmail Forwarding Confirmation",
    });

    expect(inbound.status).toBe("forwarding_confirmation");
    const settings = await t.run((ctx) =>
      ctx.db
        .query("supportEmailSettings")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId)
        )
        .unique()
    );
    expect(settings?.gmailConfirmation).toMatchObject({
      confirmationUrl: "https://mail-settings.google.com/mail/vf-%5BABC%5D-123",
      subject: "(#123456) Gmail Forwarding Confirmation",
    });
  });

  test("the forwarding test email verifies forwarding", async () => {
    const { organizationId, receive, t } = await setup();

    const inbound = await receive({
      from: "notifications@inbox.reflet.app",
      recipients: ["damien@gmail.com"],
      subject: `Reflet forwarding test [reflet-forwarding-test:${TEST_CODE}]`,
    });
    expect(inbound.status).toBe("unrouted");

    const forwarded = await receive({
      from: "notifications@inbox.reflet.app",
      recipients: ["damien@gmail.com", ALIAS_ADDRESS],
      subject: `Reflet forwarding test [reflet-forwarding-test:${TEST_CODE}]`,
    });

    expect(forwarded.status).toBe("forwarding_verified");
    const settings = await t.run((ctx) =>
      ctx.db
        .query("supportEmailSettings")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId)
        )
        .unique()
    );
    expect(settings?.forwardingVerifiedAt).toBeTypeOf("number");
  });
});

describe("acceptInbound", () => {
  test("the same email delivered twice is stored once", async () => {
    const { t } = await setup();
    const email = {
      from: CUSTOMER_EMAIL,
      rfcMessageId: "<CAF123@mail.gmail.com>",
      subject: "Hello",
      to: [THREAD_ADDRESS, ALIAS_ADDRESS],
    };

    await t.mutation(internal.support.email.inbound.accept.acceptInbound, {
      ...email,
      resendEmailId: "re_1",
    });
    await t.mutation(internal.support.email.inbound.accept.acceptInbound, {
      ...email,
      resendEmailId: "re_1",
    });
    await t.mutation(internal.support.email.inbound.accept.acceptInbound, {
      ...email,
      resendEmailId: "re_2",
    });

    const rows = await t.run((ctx) =>
      ctx.db.query("supportInboundEmails").collect()
    );
    expect(
      rows.map(({ resendEmailId, status }) => ({ resendEmailId, status }))
    ).toEqual([{ resendEmailId: "re_1", status: "pending" }]);
  });
});
