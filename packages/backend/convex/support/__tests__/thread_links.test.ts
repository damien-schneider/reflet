/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { api } from "../../_generated/api";
import { setupTest } from "../../test.helpers";
import { ensureThreadToken } from "../thread_tokens";

const GUEST_ID = "5f0c2f0e-8a1b-4c7d-9e2f-3a4b5c6d7e8f";
const TEAM_ADMIN = { _id: "user_team_admin", email: "admin@acme.dev" };

const setup = async () => {
  const t = setupTest({ authUsers: [TEAM_ADMIN] });
  const organizationId = await t.run(async (ctx) => {
    const orgId = await ctx.db.insert("organizations", {
      createdAt: Date.now(),
      isPublic: true,
      name: "Acme",
      slug: "acme",
      subscriptionStatus: "none",
      subscriptionTier: "free",
      supportEnabled: true,
    });
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId: orgId,
      role: "admin",
      userId: TEAM_ADMIN._id,
    });
    return orgId;
  });
  const conversationId = await t.mutation(api.support.conversations.create, {
    guestEmail: "guest@example.com",
    guestId: GUEST_ID,
    initialMessage: "My export is stuck",
    organizationId,
  });
  const token = await t.run(
    async (ctx) => await ensureThreadToken(ctx, conversationId)
  );
  return { conversationId, organizationId, t, token };
};

describe("support thread links", () => {
  test("a thread token opens its conversation without a guest session", async () => {
    const { conversationId, organizationId, t, token } = await setup();

    const link = await t.query(api.support.thread_links.resolve, { token });
    expect(link).toEqual({
      conversationId,
      organization: { _id: organizationId, name: "Acme", slug: "acme" },
    });

    const messages = await t.query(api.support.messages.list, {
      conversationId,
      credential: { kind: "thread", token },
    });
    expect(messages.map((message) => message.body)).toEqual([
      "My export is stuck",
    ]);
  });

  test("an unknown token resolves to nothing and reveals no messages", async () => {
    const { conversationId, t } = await setup();
    const unknownToken = "0".repeat(32);

    expect(
      await t.query(api.support.thread_links.resolve, { token: unknownToken })
    ).toBeNull();
    expect(
      await t.query(api.support.messages.list, {
        conversationId,
        credential: { kind: "thread", token: unknownToken },
      })
    ).toEqual([]);
  });

  test("a thread link never reveals the guest session that owns the conversation", async () => {
    const { conversationId, t, token } = await setup();
    const credential = { kind: "thread", token } as const;

    const conversation = await t.query(api.support.conversations.get, {
      credential,
      id: conversationId,
    });
    const messages = await t.query(api.support.messages.list, {
      conversationId,
      credential,
    });

    const exposed = JSON.stringify({ conversation, messages });
    expect(conversation).not.toBeNull();
    expect(messages).toHaveLength(1);
    expect(exposed).not.toContain(GUEST_ID);
    expect(messages[0]?.isOwnMessage).toBe(true);
  });

  test("a team member opening a customer's link writes as that customer", async () => {
    const { conversationId, t, token } = await setup();
    const teamMember = t.withIdentity({
      sessionId: TEAM_ADMIN._id,
      subject: TEAM_ADMIN._id,
    });

    await teamMember.mutation(api.support.messages.send, {
      body: "Still stuck",
      conversationId,
      credential: { kind: "thread", token },
    });

    const messages = await teamMember.query(api.support.messages.list, {
      conversationId,
    });
    expect(messages.map((message) => message.senderType)).toEqual([
      "user",
      "user",
    ]);
  });
});
