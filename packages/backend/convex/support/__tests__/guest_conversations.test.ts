/// <reference types="vite/client" />
import type { convexTest } from "convex-test";
import { beforeEach, describe, expect, test } from "vitest";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { setupTest } from "../../test.helpers";

const GUEST = { email: "guest@example.com", id: "guest_abc" };

const seedOrg = async (
  t: ReturnType<typeof convexTest>,
  supportEnabled: boolean
) =>
  await t.run(
    async (ctx) =>
      await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: true,
        name: "Acme",
        slug: `acme-${supportEnabled}`,
        subscriptionStatus: "none",
        subscriptionTier: "free",
        supportEnabled,
      })
  );

describe("guest support conversations", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = setupTest();
  });

  test("refuses to open a conversation when support is disabled", async () => {
    const organizationId = await seedOrg(t, false);

    await expect(
      t.mutation(api.support.conversations.create, {
        guestEmail: GUEST.email,
        guestId: GUEST.id,
        initialMessage: "Hello",
        organizationId,
      })
    ).rejects.toThrow("Support is not enabled");
  });

  test("refuses a guest without a valid email", async () => {
    const organizationId = await seedOrg(t, true);

    await expect(
      t.mutation(api.support.conversations.create, {
        guestEmail: "not-an-email",
        guestId: GUEST.id,
        initialMessage: "Hello",
        organizationId,
      })
    ).rejects.toThrow("valid guest email");
  });

  test("refuses an empty message", async () => {
    const organizationId = await seedOrg(t, true);

    await expect(
      t.mutation(api.support.conversations.create, {
        guestEmail: GUEST.email,
        guestId: GUEST.id,
        initialMessage: "   ",
        organizationId,
      })
    ).rejects.toThrow("Message cannot be empty");
  });

  test("stores a preview and an unread count for the admin", async () => {
    const organizationId = await seedOrg(t, true);

    const conversationId = await t.mutation(api.support.conversations.create, {
      guestEmail: GUEST.email,
      guestId: GUEST.id,
      initialMessage: "  My   invoice   is wrong  ",
      organizationId,
      subject: " Billing ",
    });

    const conversation = await t.run(
      async (ctx) => await ctx.db.get(conversationId)
    );

    expect(conversation).toMatchObject({
      adminUnreadCount: 1,
      guestEmail: GUEST.email,
      guestId: GUEST.id,
      lastMessagePreview: "My invoice is wrong",
      status: "open",
      subject: "Billing",
      userUnreadCount: 0,
    });
  });

  test("lists only the conversations belonging to the guest", async () => {
    const organizationId = await seedOrg(t, true);

    await t.mutation(api.support.conversations.create, {
      guestEmail: GUEST.email,
      guestId: GUEST.id,
      initialMessage: "Mine",
      organizationId,
    });
    await t.mutation(api.support.conversations.create, {
      guestEmail: "other@example.com",
      guestId: "guest_other",
      initialMessage: "Theirs",
      organizationId,
    });

    const mine = await t.query(api.support.conversations.listForGuest, {
      guestId: GUEST.id,
      organizationId,
    });

    expect(mine).toHaveLength(1);
    expect(mine[0].lastMessagePreview).toBe("Mine");
  });

  test("hides a conversation from a guest presenting the wrong id", async () => {
    const organizationId = await seedOrg(t, true);
    const conversationId = await t.mutation(api.support.conversations.create, {
      guestEmail: GUEST.email,
      guestId: GUEST.id,
      initialMessage: "Secret",
      organizationId,
    });

    expect(
      await t.query(api.support.conversations.get, {
        guestId: "guest_intruder",
        id: conversationId,
      })
    ).toBeNull();

    expect(
      await t.query(api.support.messages.list, {
        conversationId,
        guestId: "guest_intruder",
      })
    ).toEqual([]);

    expect(
      await t.query(api.support.messages.listReactions, {
        conversationId,
        guestId: "guest_intruder",
      })
    ).toEqual([]);
  });

  test("rejects a reply from a guest presenting the wrong id", async () => {
    const organizationId = await seedOrg(t, true);
    const conversationId = await t.mutation(api.support.conversations.create, {
      guestEmail: GUEST.email,
      guestId: GUEST.id,
      initialMessage: "Secret",
      organizationId,
    });

    await expect(
      t.mutation(api.support.messages.send, {
        body: "let me in",
        conversationId,
        guestId: "guest_intruder",
      })
    ).rejects.toThrow("don't have access");
  });

  test("reopens a resolved conversation when the guest replies", async () => {
    const organizationId = await seedOrg(t, true);
    const conversationId = await t.mutation(api.support.conversations.create, {
      guestEmail: GUEST.email,
      guestId: GUEST.id,
      initialMessage: "First",
      organizationId,
    });

    await t.run(async (ctx) => {
      await ctx.db.patch(conversationId, { status: "resolved" });
    });

    await t.mutation(api.support.messages.send, {
      body: "Still broken",
      conversationId,
      guestId: GUEST.id,
    });

    const conversation = await t.run(
      async (ctx) => await ctx.db.get(conversationId)
    );

    expect(conversation?.status).toBe("open");
    expect(conversation?.adminUnreadCount).toBe(2);
    expect(conversation?.lastMessagePreview).toBe("Still broken");
  });

  test("clears the guest unread count and marks admin replies read", async () => {
    const organizationId = await seedOrg(t, true);
    const conversationId = await t.mutation(api.support.conversations.create, {
      guestEmail: GUEST.email,
      guestId: GUEST.id,
      initialMessage: "First",
      organizationId,
    });

    const adminMessageId: Id<"supportMessages"> = await t.run(async (ctx) => {
      await ctx.db.patch(conversationId, { userUnreadCount: 1 });
      return await ctx.db.insert("supportMessages", {
        body: "On it",
        conversationId,
        createdAt: Date.now(),
        isRead: false,
        senderId: "admin_1",
        senderType: "admin",
      });
    });

    await t.mutation(api.support.messages.markAsRead, {
      conversationId,
      guestId: GUEST.id,
    });

    const { adminMessage, conversation } = await t.run(async (ctx) => ({
      adminMessage: await ctx.db.get(adminMessageId),
      conversation: await ctx.db.get(conversationId),
    }));

    expect(conversation?.userUnreadCount).toBe(0);
    expect(conversation?.adminUnreadCount).toBe(1);
    expect(adminMessage?.isRead).toBe(true);
  });

  test("lists a mixed guest/admin thread without resolving the guest id", async () => {
    const organizationId = await seedOrg(t, true);
    const conversationId = await t.mutation(api.support.conversations.create, {
      guestEmail: GUEST.email,
      guestId: GUEST.id,
      initialMessage: "First",
      organizationId,
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("supportMessages", {
        body: "On it",
        conversationId,
        createdAt: Date.now() + 1,
        isRead: false,
        senderId: "admin_1",
        senderType: "admin",
      });
    });

    const messages = await t.query(api.support.messages.list, {
      conversationId,
      guestId: GUEST.id,
    });

    expect(messages.map((m) => m.senderType)).toEqual(["user", "admin"]);
    expect(messages[0].sender?.email).toBe(GUEST.email);
    expect(messages[0].isOwnMessage).toBe(true);
    expect(messages[1].isOwnMessage).toBe(false);
  });

  test("marks the guest's own message as read from their side", async () => {
    const organizationId = await seedOrg(t, true);
    const conversationId = await t.mutation(api.support.conversations.create, {
      guestEmail: GUEST.email,
      guestId: GUEST.id,
      initialMessage: "First",
      organizationId,
    });

    await t.mutation(api.support.messages.markAsRead, {
      conversationId,
      guestId: GUEST.id,
    });

    const messages = await t.query(api.support.messages.list, {
      conversationId,
      guestId: GUEST.id,
    });

    expect(messages).toHaveLength(1);
    expect(messages[0].isRead).toBe(false);
    expect(messages[0].isOwnMessage).toBe(true);
    expect(messages[0].sender?.email).toBe(GUEST.email);
  });
});
