/// <reference types="vite/client" />

import { type TestConvex as ConvexTestInstance, convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { internal } from "../../_generated/api";
import { hashSecretKey } from "../../feedback/api_auth";
import schema from "../../schema";
import { seedOrganization } from "../../test.fixtures";
import { modules } from "../../test.helpers";
import { DEVTOOLS_TOKEN_IDLE_EXPIRY_MS } from "../constants";

const USER_ID = "user-1";
const PUBLIC_KEY = "fb_pub_widget";
const CODE_CHALLENGE = "a".repeat(43);
const REDIRECT_URI =
  "http://localhost:3000/api/reflet-devtools/connect/callback";

async function setup() {
  const t = convexTest(schema, modules);
  const { memberId, organizationId } = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    const memberId = await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId,
      role: "member",
      userId: USER_ID,
    });
    await ctx.db.insert("organizationApiKeys", {
      createdAt: Date.now(),
      isActive: true,
      name: "Widget",
      organizationId,
      publicKey: PUBLIC_KEY,
      secretKeyHash: await hashSecretKey("fb_sec_widget"),
    });
    return { memberId, organizationId };
  });
  return { memberId, organizationId, t };
}

type TestConvex = ConvexTestInstance<typeof schema>;

async function storeCode(t: TestConvex, code: string): Promise<void> {
  await t.mutation(internal.devtools.connect.storeConnectCode, {
    codeChallenge: CODE_CHALLENGE,
    codeHash: await hashSecretKey(code),
    publicKey: PUBLIC_KEY,
    redirectUri: REDIRECT_URI,
    userId: USER_ID,
  });
}

async function redeem(
  t: TestConvex,
  code: string,
  overrides: { codeChallenge?: string; tokenHash?: string } = {}
) {
  return await t.mutation(internal.devtools.connect.redeemConnectCode, {
    codeChallenge: overrides.codeChallenge ?? CODE_CHALLENGE,
    codeHash: await hashSecretKey(code),
    label: "localhost:3000",
    redirectUri: REDIRECT_URI,
    tokenHash: overrides.tokenHash ?? (await hashSecretKey("fb_dev_token")),
  });
}

async function validate(t: TestConvex) {
  return await t.query(internal.devtools.tokens.validateDevtoolsToken, {
    tokenHash: await hashSecretKey("fb_dev_token"),
  });
}

describe("devtools connect codes", () => {
  test("redeem a code once into a token for the member's organization", async () => {
    const { organizationId, t } = await setup();
    await storeCode(t, "code-1");

    expect(await redeem(t, "code-1")).toEqual({
      ok: true,
      organizationName: "Acme",
    });
    expect(await redeem(t, "code-1")).toEqual({ ok: false });
    expect(await validate(t)).toMatchObject({ organizationId });
  });

  test("burns the code when the PKCE verifier does not match", async () => {
    const { t } = await setup();
    await storeCode(t, "code-1");

    expect(
      await redeem(t, "code-1", { codeChallenge: "b".repeat(43) })
    ).toEqual({ ok: false });
    expect(await redeem(t, "code-1")).toEqual({ ok: false });
  });

  test("refuses an expired code", async () => {
    const { t } = await setup();
    await storeCode(t, "code-1");
    await t.run(async (ctx) => {
      const [row] = await ctx.db.query("devtoolsConnectCodes").collect();
      if (row) {
        await ctx.db.patch(row._id, { expiresAt: Date.now() - 1 });
      }
    });

    expect(await redeem(t, "code-1")).toEqual({ ok: false });
  });

  test("refuses a code whose approver left the organization", async () => {
    const { memberId, t } = await setup();
    await storeCode(t, "code-1");
    await t.run(async (ctx) => ctx.db.delete(memberId));

    expect(await redeem(t, "code-1")).toEqual({ ok: false });
  });

  test("refuses to store a code for someone outside the organization", async () => {
    const { t } = await setup();
    await expect(
      t.mutation(internal.devtools.connect.storeConnectCode, {
        codeChallenge: CODE_CHALLENGE,
        codeHash: await hashSecretKey("code-1"),
        publicKey: PUBLIC_KEY,
        redirectUri: REDIRECT_URI,
        userId: "stranger",
      })
    ).rejects.toThrow("not a member");
  });
});

describe("devtools tokens", () => {
  async function connected() {
    const setupResult = await setup();
    await storeCode(setupResult.t, "code-1");
    await redeem(setupResult.t, "code-1");
    return setupResult;
  }

  async function ageToken(t: TestConvex, lastUsedAt: number): Promise<void> {
    await t.run(async (ctx) => {
      const [token] = await ctx.db.query("devtoolsTokens").collect();
      if (token) {
        await ctx.db.patch(token._id, { lastUsedAt });
      }
    });
  }

  test("expires after 30 idle days", async () => {
    const { t } = await connected();
    await ageToken(t, Date.now() - DEVTOOLS_TOKEN_IDLE_EXPIRY_MS + 60_000);
    expect(await validate(t)).not.toBeNull();

    await ageToken(t, Date.now() - 31 * 24 * 60 * 60_000);
    expect(await validate(t)).toBeNull();
  });

  test("stops working once the member leaves the organization", async () => {
    const { memberId, t } = await connected();
    await t.run(async (ctx) => ctx.db.delete(memberId));
    expect(await validate(t)).toBeNull();
  });

  test("cleanup deletes idle tokens and expired codes", async () => {
    const { t } = await connected();
    await storeCode(t, "code-2");
    await ageToken(t, Date.now() - 31 * 24 * 60 * 60_000);
    await t.run(async (ctx) => {
      const [row] = await ctx.db.query("devtoolsConnectCodes").collect();
      if (row) {
        await ctx.db.patch(row._id, { expiresAt: Date.now() - 1 });
      }
    });

    await t.mutation(
      internal.devtools.tokens.cleanupExpiredDevtoolsCredentials,
      {}
    );

    const remaining = await t.run(async (ctx) => ({
      codes: await ctx.db.query("devtoolsConnectCodes").collect(),
      tokens: await ctx.db.query("devtoolsTokens").collect(),
    }));
    expect(remaining).toEqual({ codes: [], tokens: [] });
  });
});
