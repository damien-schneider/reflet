/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { api, internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { hashSecretKey } from "../../feedback/api_auth";
import { seedOrganization } from "../../test.fixtures";
import { setupTest, type TestContext } from "../../test.helpers";
import { TEAM_TOKEN_TTL_MS } from "../constants";

const MEMBER = { _id: "user-1", email: "member@acme.test" };
const OTHER_MEMBER = { _id: "user-2", email: "other@acme.test" };
const APP_ORIGIN = "https://app.acme.com";
const TOKEN = `fb_team_${"a".repeat(64)}`;

interface TokenBinding {
  apiKeyId: Id<"organizationApiKeys">;
  organizationId: Id<"organizations">;
}

async function setup() {
  const t = setupTest({ authUsers: [MEMBER, OTHER_MEMBER] });
  const seeded = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    const memberId = await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId,
      role: "member",
      userId: MEMBER._id,
    });
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId,
      role: "member",
      userId: OTHER_MEMBER._id,
    });
    const apiKeyId = await ctx.db.insert("organizationApiKeys", {
      allowedDomains: ["app.acme.com", "admin.acme.com"],
      createdAt: Date.now(),
      isActive: true,
      name: "Widget",
      organizationId,
      publicKey: "fb_pub_widget",
      secretKeyHash: await hashSecretKey("fb_sec_widget"),
    });
    const binding: TokenBinding = { apiKeyId, organizationId };
    return { binding, memberId };
  });
  return { ...seeded, t };
}

async function insertToken(
  t: TestContext,
  options: { binding: TokenBinding; token: string; userId: string }
): Promise<Id<"teamAccessTokens">> {
  const tokenHash = await hashSecretKey(options.token);
  return await t.run(async (ctx) =>
    ctx.db.insert("teamAccessTokens", {
      ...options.binding,
      createdAt: Date.now(),
      expiresAt: Date.now() + TEAM_TOKEN_TTL_MS,
      lastUsedAt: Date.now(),
      origin: APP_ORIGIN,
      tokenHash,
      userId: options.userId,
    })
  );
}

async function validate(t: TestContext, origin = APP_ORIGIN) {
  return await t.query(internal.team_access.tokens.validateTeamToken, {
    origin,
    tokenHash: await hashSecretKey(TOKEN),
  });
}

describe("team token validation", () => {
  test("resolves the member only from the origin the token is bound to", async () => {
    const { binding, t } = await setup();
    const teamTokenId = await insertToken(t, {
      binding,
      token: TOKEN,
      userId: MEMBER._id,
    });

    expect(await validate(t)).toEqual({
      organizationId: binding.organizationId,
      teamTokenId,
      userId: MEMBER._id,
    });
    expect(await validate(t, "https://evil.test")).toBeNull();
    expect(await validate(t, "http://app.acme.com")).toBeNull();
    expect(await validate(t, "https://app.acme.com:8443")).toBeNull();
  });

  test("expires seven days after sign-in even when used every day", async () => {
    const { binding, t } = await setup();
    const teamTokenId = await insertToken(t, {
      binding,
      token: TOKEN,
      userId: MEMBER._id,
    });
    await t.run(async (ctx) =>
      ctx.db.patch(teamTokenId, {
        expiresAt: Date.now() - 1,
        lastUsedAt: Date.now(),
      })
    );

    expect(await validate(t)).toBeNull();
  });

  test("stops working once the member leaves the organization", async () => {
    const { binding, memberId, t } = await setup();
    await insertToken(t, { binding, token: TOKEN, userId: MEMBER._id });
    await t.run(async (ctx) => ctx.db.delete(memberId));

    expect(await validate(t)).toBeNull();
  });

  test("stops working once its API key is deactivated or deleted", async () => {
    const { binding, t } = await setup();
    await insertToken(t, { binding, token: TOKEN, userId: MEMBER._id });

    await t.run(async (ctx) =>
      ctx.db.patch(binding.apiKeyId, { isActive: false })
    );
    expect(await validate(t)).toBeNull();

    await t.run(async (ctx) => ctx.db.delete(binding.apiKeyId));
    expect(await validate(t)).toBeNull();
  });

  test("stops working once the app's domain is removed from its API key", async () => {
    const { binding, t } = await setup();
    await insertToken(t, { binding, token: TOKEN, userId: MEMBER._id });

    await t.run(async (ctx) =>
      ctx.db.patch(binding.apiKeyId, { allowedDomains: ["admin.acme.com"] })
    );
    expect(await validate(t)).toBeNull();

    await t.run(async (ctx) =>
      ctx.db.patch(binding.apiKeyId, { allowedDomains: [] })
    );
    expect(await validate(t)).toBeNull();
  });
});

describe("team tokens in the account", () => {
  test("members list and revoke only their own team access", async () => {
    const { binding, t } = await setup();
    const ownTokenId = await insertToken(t, {
      binding,
      token: TOKEN,
      userId: MEMBER._id,
    });
    const otherTokenId = await insertToken(t, {
      binding,
      token: `fb_team_${"b".repeat(64)}`,
      userId: OTHER_MEMBER._id,
    });
    const member = t.withIdentity({
      sessionId: MEMBER._id,
      subject: MEMBER._id,
    });

    const listed = await member.query(api.team_access.tokens.listMine, {});
    expect(listed).toEqual([
      expect.objectContaining({
        _id: ownTokenId,
        organizationName: "Acme",
        origin: APP_ORIGIN,
      }),
    ]);

    await expect(
      member.mutation(api.team_access.tokens.revoke, { tokenId: otherTokenId })
    ).rejects.toThrow("Team access not found");
    await member.mutation(api.team_access.tokens.revoke, {
      tokenId: ownTokenId,
    });

    expect(await validate(t)).toBeNull();
    expect(await t.run(async (ctx) => ctx.db.get(otherTokenId))).not.toBeNull();
  });

  test("cleanup deletes expired codes and tokens and keeps live ones", async () => {
    const { binding, t } = await setup();
    const liveTokenId = await insertToken(t, {
      binding,
      token: TOKEN,
      userId: MEMBER._id,
    });
    const expiredTokenId = await insertToken(t, {
      binding,
      token: `fb_team_${"c".repeat(64)}`,
      userId: MEMBER._id,
    });
    await t.run(async (ctx) => {
      await ctx.db.patch(expiredTokenId, { expiresAt: Date.now() - 1 });
      await ctx.db.insert("teamAccessCodes", {
        ...binding,
        codeChallenge: "a".repeat(43),
        codeHash: await hashSecretKey("expired-code"),
        expiresAt: Date.now() - 1,
        origin: APP_ORIGIN,
        userId: MEMBER._id,
      });
    });

    await t.mutation(
      internal.team_access.tokens.cleanupExpiredTeamCredentials,
      {}
    );

    const remaining = await t.run(async (ctx) => ({
      codes: await ctx.db.query("teamAccessCodes").collect(),
      tokenIds: (await ctx.db.query("teamAccessTokens").collect()).map(
        (token) => token._id
      ),
    }));
    expect(remaining).toEqual({ codes: [], tokenIds: [liveTokenId] });
  });
});
