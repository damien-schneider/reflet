/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { api } from "../../_generated/api";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const PUBLIC_KEY = "fb_pub_vendor";
const VENDOR_ADMIN = { _id: "user_vendor_admin", email: "team@vendor.app" };
const CUSTOMER = { _id: "user_customer", email: "ana@customer.app" };

const setup = async (desk: { isActive: boolean; supportEnabled: boolean }) => {
  const t = setupTest({ authUsers: [VENDOR_ADMIN, CUSTOMER] });
  const organizationId = await t.run(async (ctx) => {
    const orgId = await seedOrganization(ctx, {
      name: "Vendor",
      slug: "vendor",
      supportEnabled: desk.supportEnabled,
    });
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId: orgId,
      role: "owner",
      userId: VENDOR_ADMIN._id,
    });
    await ctx.db.insert("organizationApiKeys", {
      createdAt: Date.now(),
      isActive: desk.isActive,
      name: "Dashboard",
      organizationId: orgId,
      publicKey: PUBLIC_KEY,
      secretKeyHash: "unused",
    });
    return orgId;
  });
  const as = (user: { _id: string }) =>
    t.withIdentity({ sessionId: user._id, subject: user._id });
  return { as, organizationId, t };
};

describe("support desk reached by public key", () => {
  test("a signed-in customer's message lands in the vendor inbox", async () => {
    const { as, organizationId } = await setup({
      isActive: true,
      supportEnabled: true,
    });
    const customer = as(CUSTOMER);

    const desk = await customer.query(
      api.support.settings.findOpenDeskByPublicKey,
      { publicKey: PUBLIC_KEY }
    );
    expect(desk).toEqual({
      _id: organizationId,
      name: "Vendor",
      slug: "vendor",
    });

    const conversationId = await customer.mutation(
      api.support.conversations.create,
      { initialMessage: "Export is broken", organizationId }
    );

    const inbox = await as(VENDOR_ADMIN).query(api.support.admin.list, {
      organizationId,
    });
    expect(inbox.map((conversation) => conversation._id)).toEqual([
      conversationId,
    ]);
    expect(inbox[0]?.userId).toBe(CUSTOMER._id);

    const own = await customer.query(api.support.conversations.listForUser, {
      organizationId,
    });
    expect(own.map((conversation) => conversation._id)).toEqual([
      conversationId,
    ]);
  });

  test.each(["", "🙂".repeat(9)])("refuses the reaction %j", async (emoji) => {
    const { as, organizationId } = await setup({
      isActive: true,
      supportEnabled: true,
    });
    const customer = as(CUSTOMER);
    const conversationId = await customer.mutation(
      api.support.conversations.create,
      { initialMessage: "Export is broken", organizationId }
    );
    const [message] = await customer.query(api.support.messages.list, {
      conversationId,
    });

    await expect(
      customer.mutation(api.support.messages.addReaction, {
        emoji,
        messageId: message._id,
      })
    ).rejects.toThrow(/Emoji/);
  });

  test("a reaction tells each viewer only whether it is theirs", async () => {
    const { as, organizationId } = await setup({
      isActive: true,
      supportEnabled: true,
    });
    const customer = as(CUSTOMER);
    const vendor = as(VENDOR_ADMIN);
    const conversationId = await customer.mutation(
      api.support.conversations.create,
      { initialMessage: "Export is broken", organizationId }
    );
    const [message] = await customer.query(api.support.messages.list, {
      conversationId,
    });
    await vendor.mutation(api.support.messages.addReaction, {
      emoji: "👍",
      messageId: message._id,
    });

    const seenBy = async (viewer: typeof vendor) =>
      (
        await viewer.query(api.support.messages.listReactions, {
          conversationId,
        })
      ).flatMap((row) => row.reactions);

    expect(await seenBy(vendor)).toEqual([
      { count: 1, emoji: "👍", reactedByViewer: true },
    ]);
    expect(await seenBy(customer)).toEqual([
      { count: 1, emoji: "👍", reactedByViewer: false },
    ]);
  });

  test.each([
    { isActive: true, supportEnabled: false },
    { isActive: false, supportEnabled: true },
  ])("stays closed for %o", async (desk) => {
    const { as } = await setup(desk);

    expect(
      await as(CUSTOMER).query(api.support.settings.findOpenDeskByPublicKey, {
        publicKey: PUBLIC_KEY,
      })
    ).toBeNull();
  });
});
