/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { api, internal } from "../../_generated/api";
import { pkceChallengeFor } from "../../devtools/pkce";
import { hashSecretKey } from "../../feedback/api_auth";
import { seedOrganization } from "../../test.fixtures";
import { setupTest, type TestContext } from "../../test.helpers";
import { TEAM_TOKEN_TTL_MS } from "../constants";

const MEMBER = { _id: "user-1", email: "member@acme.test" };
const PUBLIC_KEY = "fb_pub_locked";
const APP_ORIGIN = "https://app.acme.com";
const CODE_VERIFIER = "v".repeat(43);
const TEAM_TOKEN_PATTERN = /^fb_team_[0-9a-f]{64}$/;

async function setup() {
  const t = setupTest({ authUsers: [MEMBER] });
  await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx, { isPublic: false });
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId,
      role: "member",
      userId: MEMBER._id,
    });
    await ctx.db.insert("organizationApiKeys", {
      allowedDomains: ["app.acme.com"],
      createdAt: Date.now(),
      isActive: true,
      name: "Widget",
      organizationId,
      publicKey: PUBLIC_KEY,
      secretKeyHash: await hashSecretKey("fb_sec_widget"),
    });
  });
  const { code } = await t
    .withIdentity({ sessionId: MEMBER._id, subject: MEMBER._id })
    .action(api.team_access.connect.approve, {
      codeChallenge: await pkceChallengeFor(CODE_VERIFIER),
      origin: APP_ORIGIN,
      publicKey: PUBLIC_KEY,
    });
  return { code, t };
}

function exchange(
  t: TestContext,
  options: { code: string; codeVerifier?: string; origin?: string }
) {
  return t.fetch("/api/v1/team/token", {
    body: JSON.stringify({
      code: options.code,
      codeVerifier: options.codeVerifier ?? CODE_VERIFIER,
    }),
    headers: {
      "Content-Type": "application/json",
      ...(options.origin === undefined ? {} : { Origin: options.origin }),
    },
    method: "POST",
  });
}

async function validateFrom(t: TestContext, token: string, origin: string) {
  return await t.query(internal.team_access.tokens.validateTeamToken, {
    origin,
    tokenHash: await hashSecretKey(token),
  });
}

describe("team token exchange", () => {
  test("an approved code exchanges once, from its origin, for a 7-day token", async () => {
    const { code, t } = await setup();
    const response = await exchange(t, { code, origin: APP_ORIGIN });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body).toEqual({
      expiresAt: expect.any(Number),
      organizationName: "Acme",
      token: expect.stringMatching(TEAM_TOKEN_PATTERN),
    });
    expect(body.expiresAt - Date.now()).toBeGreaterThan(
      TEAM_TOKEN_TTL_MS - 60_000
    );
    expect(await validateFrom(t, body.token, APP_ORIGIN)).not.toBeNull();
    expect(await validateFrom(t, body.token, "https://evil.test")).toBeNull();

    expect((await exchange(t, { code, origin: APP_ORIGIN })).status).toBe(400);
  });

  test("the exchanged token stays bound to the key the member approved", async () => {
    const { code, t } = await setup();
    const { token } = await (
      await exchange(t, { code, origin: APP_ORIGIN })
    ).json();

    await t.run(async (ctx) => {
      for (const key of await ctx.db.query("organizationApiKeys").collect()) {
        await ctx.db.patch(key._id, { isActive: false });
      }
    });

    expect(await validateFrom(t, token, APP_ORIGIN)).toBeNull();
  });

  test("refuses another Origin, a missing Origin or a wrong verifier, and burns the code", async () => {
    for (const attempt of [
      { origin: "https://evil.test" },
      { origin: undefined },
      { codeVerifier: "w".repeat(43), origin: APP_ORIGIN },
    ]) {
      const { code, t } = await setup();
      expect((await exchange(t, { ...attempt, code })).status).toBe(400);
      expect((await exchange(t, { code, origin: APP_ORIGIN })).status).toBe(
        400
      );
    }
  });

  test("refuses an expired code", async () => {
    const { code, t } = await setup();
    await t.run(async (ctx) => {
      for (const row of await ctx.db.query("teamAccessCodes").collect()) {
        await ctx.db.patch(row._id, { expiresAt: Date.now() - 1 });
      }
    });

    expect((await exchange(t, { code, origin: APP_ORIGIN })).status).toBe(400);
  });
});

describe("team token revoke", () => {
  test("a revoked token stops resolving", async () => {
    const { code, t } = await setup();
    const { token } = await (
      await exchange(t, { code, origin: APP_ORIGIN })
    ).json();

    const revoke = await t.fetch("/api/v1/team/revoke", {
      headers: { Authorization: `Bearer ${token}`, Origin: APP_ORIGIN },
      method: "POST",
    });

    expect(revoke.status).toBe(200);
    expect(await revoke.json()).toEqual({ revoked: true });
    expect(await validateFrom(t, token, APP_ORIGIN)).toBeNull();
  });

  test("needs a team token", async () => {
    const { t } = await setup();
    const response = await t.fetch("/api/v1/team/revoke", {
      headers: { Authorization: `Bearer ${PUBLIC_KEY}` },
      method: "POST",
    });
    expect(response.status).toBe(401);
  });

  test("answers the cross-origin preflight", async () => {
    const { t } = await setup();
    for (const path of ["/api/v1/team/token", "/api/v1/team/revoke"]) {
      const response = await t.fetch(path, { method: "OPTIONS" });
      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    }
  });
});
