/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { api } from "../../_generated/api";
import { MAX_URL_LENGTH, MAX_USER_AGENT_LENGTH } from "../../shared/constants";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const ADMIN = { _id: "user_admin", email: "team@acme.test" };
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const VISITOR = { visitorId: "v_visitor", widgetId: "wgt_1" };

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
    await ctx.db.insert("widgets", {
      createdAt: Date.now(),
      isActive: true,
      name: "Support",
      organizationId: orgId,
      updatedAt: Date.now(),
      widgetId: VISITOR.widgetId,
    });
    return orgId;
  });
  const admin = t.withIdentity({ sessionId: ADMIN._id, subject: ADMIN._id });
  return { admin, organizationId, t };
};

describe("widget conversations", () => {
  test("opening the widget creates nothing until the first message", async () => {
    const { t } = await setup();

    expect(
      await t.query(api.widget.public.getConversation, VISITOR)
    ).toBeNull();
    expect(await t.query(api.widget.public.listMessages, VISITOR)).toEqual([]);
  });

  test("the first message opens a guest conversation the inbox can list", async () => {
    const { admin, organizationId, t } = await setup();

    const { conversationId } = await t.mutation(api.widget.public.sendMessage, {
      ...VISITOR,
      body: "  Checkout   fails  ",
    });

    const conversation = await t.run((ctx) => ctx.db.get(conversationId));
    expect(conversation?.guestId).toMatch(UUID_PATTERN);
    expect(conversation?.userId).toBe(`guest:${conversation?.guestId}`);
    expect(conversation?.lastMessagePreview).toBe("Checkout fails");

    const inbox = await admin.query(api.support.admin.list, {
      organizationId,
    });
    expect(inbox.map((row) => row._id)).toEqual([conversationId]);

    const messages = await t.query(api.widget.public.listMessages, VISITOR);
    expect(messages).toMatchObject([
      { body: "Checkout   fails", isOwnMessage: true, senderType: "user" },
    ]);
  });

  test("a message on a closed conversation reopens it in the same thread", async () => {
    const { t } = await setup();
    const { conversationId } = await t.mutation(api.widget.public.sendMessage, {
      ...VISITOR,
      body: "First",
    });
    await t.run((ctx) => ctx.db.patch(conversationId, { status: "closed" }));

    const second = await t.mutation(api.widget.public.sendMessage, {
      ...VISITOR,
      body: "Still broken",
    });

    expect(second.conversationId).toBe(conversationId);
    const conversation = await t.run((ctx) => ctx.db.get(conversationId));
    expect(conversation).toMatchObject({ adminUnreadCount: 2, status: "open" });
  });

  test("clips oversized page metadata instead of rejecting the visitor", async () => {
    const { t } = await setup();
    const longUrl = `https://acme.test/?q=${"x".repeat(MAX_URL_LENGTH)}`;

    await t.mutation(api.widget.public.sendMessage, {
      ...VISITOR,
      body: "Hello",
      metadata: {
        referrer: longUrl,
        url: longUrl,
        userAgent: "u".repeat(MAX_USER_AGENT_LENGTH + 1),
      },
    });

    const stored = await t.run((ctx) =>
      ctx.db.query("widgetConversations").unique()
    );
    expect(stored?.metadata?.url).toHaveLength(MAX_URL_LENGTH);
    expect(stored?.metadata?.referrer).toHaveLength(MAX_URL_LENGTH);
    expect(stored?.metadata?.userAgent).toHaveLength(MAX_USER_AGENT_LENGTH);
  });
});
