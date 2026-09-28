/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { pkceChallengeFor } from "../../devtools/pkce";
import { hashSecretKey } from "../../feedback/api_auth";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const DEV_TOKEN = `fb_dev_${"a".repeat(64)}`;
const CODE_VERIFIER = "v".repeat(43);
const REDIRECT_URI =
  "http://localhost:3000/api/reflet-devtools/connect/callback";

async function setup() {
  const t = setupTest();
  await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx, { isPublic: false });
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId,
      role: "member",
      userId: "user-1",
    });
    await ctx.db.insert("devtoolsTokens", {
      createdAt: Date.now(),
      label: "localhost:3000",
      lastUsedAt: Date.now(),
      organizationId,
      tokenHash: await hashSecretKey(DEV_TOKEN),
      userId: "user-1",
    });
    await ctx.db.insert("devtoolsConnectCodes", {
      codeChallenge: await pkceChallengeFor(CODE_VERIFIER),
      codeHash: await hashSecretKey("one-time-code"),
      expiresAt: Date.now() + 60_000,
      organizationId,
      redirectUri: REDIRECT_URI,
      userId: "user-1",
    });
  });
  return t;
}

const withDevToken = (init: RequestInit = {}): RequestInit => ({
  ...init,
  headers: { Authorization: `Bearer ${DEV_TOKEN}` },
});

describe("devtools tokens on the HTTP API", () => {
  test("read a private organization's board through the devtools paths", async () => {
    const t = await setup();
    const response = await t.fetch("/api/v1/feedback/list", withDevToken());
    expect(response.status).toBe(200);
  });

  test("devtools notes stay internal and belong to the connected member", async () => {
    const t = await setup();
    const response = await t.fetch(
      "/api/v1/feedback/create",
      withDevToken({
        body: JSON.stringify({
          description: "A private note",
          internal: false,
          title: "Dev note",
        }),
        method: "POST",
      })
    );
    expect(response.status).toBe(201);
    const notes = await t.run((ctx) => ctx.db.query("feedback").collect());
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ authorId: "user-1", isInternal: true });
  });

  test("do not reach public API paths outside the devtools set", async () => {
    const t = await setup();
    const response = await t.fetch("/api/v1/feedback", withDevToken());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Devtools tokens only reach the devtools endpoints.",
    });
  });

  test("do not reach the admin API", async () => {
    const t = await setup();
    const response = await t.fetch(
      "/api/v1/admin/feedback/delete",
      withDevToken({ body: "{}", method: "POST" })
    );
    expect(response.status).toBe(401);
  });

  test("a connect code exchanges for a token only once", async () => {
    const t = await setup();
    const exchange = () =>
      t.fetch("/api/v1/devtools/token", {
        body: JSON.stringify({
          code: "one-time-code",
          codeVerifier: CODE_VERIFIER,
          redirectUri: REDIRECT_URI,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

    const first = await exchange();
    expect(first.status).toBe(200);
    const body = await first.json();
    expect(body.organizationName).toBe("Acme");
    expect(body.token).toMatch(/^fb_dev_[0-9a-f]{64}$/);

    const replay = await exchange();
    expect(replay.status).toBe(400);
  });

  test("a revoked token stops working", async () => {
    const t = await setup();
    const revoke = await t.fetch(
      "/api/v1/devtools/revoke",
      withDevToken({ method: "POST" })
    );
    expect(revoke.status).toBe(200);
    const response = await t.fetch("/api/v1/feedback/list", withDevToken());
    expect(response.status).toBe(401);
  });
});
