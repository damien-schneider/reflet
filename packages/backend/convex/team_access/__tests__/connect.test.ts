/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { api } from "../../_generated/api";
import { hashSecretKey } from "../../feedback/api_auth";
import { seedOrganization } from "../../test.fixtures";
import { setupTest, type TestContext } from "../../test.helpers";

const MEMBER = { _id: "user-1", email: "member@acme.test" };
const STRANGER = { _id: "user-2", email: "stranger@evil.test" };
const LOCKED_KEY = "fb_pub_locked";
const OPEN_KEY = "fb_pub_open";
const APP_ORIGIN = "https://app.acme.com";
const CODE_CHALLENGE = "a".repeat(43);

async function setup() {
  const t = setupTest({ authUsers: [MEMBER, STRANGER] });
  await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId,
      role: "member",
      userId: MEMBER._id,
    });
    for (const [publicKey, allowedDomains] of [
      [LOCKED_KEY, ["app.acme.com"]],
      [OPEN_KEY, undefined],
    ] as const) {
      await ctx.db.insert("organizationApiKeys", {
        allowedDomains: allowedDomains ? [...allowedDomains] : undefined,
        createdAt: Date.now(),
        isActive: true,
        name: publicKey,
        organizationId,
        publicKey,
        secretKeyHash: await hashSecretKey(`fb_sec_${publicKey}`),
      });
    }
  });
  return t;
}

const signedInAs = (t: TestContext, userId: string) =>
  t.withIdentity({ sessionId: userId, subject: userId });

async function storedCodeOrigins(t: TestContext): Promise<string[]> {
  return await t.run(async (ctx) =>
    (await ctx.db.query("teamAccessCodes").collect()).map((row) => row.origin)
  );
}

describe("team access consent target", () => {
  test("describes the organization and origin to a member", async () => {
    const t = await setup();
    const target = await signedInAs(t, MEMBER._id).query(
      api.team_access.connect.getTarget,
      { origin: APP_ORIGIN, publicKey: LOCKED_KEY }
    );
    expect(target).toEqual({
      isMember: true,
      organizationName: "Acme",
      origin: APP_ORIGIN,
      originProblem: null,
    });
  });

  test("reveals nothing when signed out or for an unknown key", async () => {
    const t = await setup();
    const args = { origin: APP_ORIGIN, publicKey: LOCKED_KEY };
    expect(await t.query(api.team_access.connect.getTarget, args)).toBeNull();
    expect(
      await signedInAs(t, MEMBER._id).query(api.team_access.connect.getTarget, {
        ...args,
        publicKey: "fb_pub_unknown",
      })
    ).toBeNull();
  });

  test("reports why an origin cannot get team access", async () => {
    const t = await setup();
    const member = signedInAs(t, MEMBER._id);
    const problemFor = async (publicKey: string, origin: string) =>
      (
        await member.query(api.team_access.connect.getTarget, {
          origin,
          publicKey,
        })
      )?.originProblem;

    expect(await problemFor(OPEN_KEY, APP_ORIGIN)).toBe("no_allowed_domains");
    expect(await problemFor(LOCKED_KEY, "https://evil.test")).toBe(
      "not_allowed"
    );
    expect(await problemFor(LOCKED_KEY, `${APP_ORIGIN}/`)).toBe("invalid");
  });
});

describe("approving team access", () => {
  test("gives a member a code bound to the exact origin", async () => {
    const t = await setup();
    const { code } = await signedInAs(t, MEMBER._id).action(
      api.team_access.connect.approve,
      {
        codeChallenge: CODE_CHALLENGE,
        origin: APP_ORIGIN,
        publicKey: LOCKED_KEY,
      }
    );

    expect(code).toMatch(/^[0-9a-f]{64}$/);
    expect(await storedCodeOrigins(t)).toEqual([APP_ORIGIN]);
  });

  test("never issues a code for a key without allowed domains or an unlisted origin", async () => {
    const t = await setup();
    const member = signedInAs(t, MEMBER._id);
    const attempts = [
      { origin: APP_ORIGIN, publicKey: OPEN_KEY },
      { origin: "https://evil.test", publicKey: LOCKED_KEY },
      { origin: "http://app.acme.com", publicKey: LOCKED_KEY },
      { origin: "https://app.acme.com:8443", publicKey: LOCKED_KEY },
      { origin: `${APP_ORIGIN}/callback`, publicKey: LOCKED_KEY },
    ];
    for (const attempt of attempts) {
      await expect(
        member.action(api.team_access.connect.approve, {
          ...attempt,
          codeChallenge: CODE_CHALLENGE,
        })
      ).rejects.toThrow();
    }
    expect(await storedCodeOrigins(t)).toEqual([]);
  });

  test("refuses someone outside the organization or signed out", async () => {
    const t = await setup();
    const args = {
      codeChallenge: CODE_CHALLENGE,
      origin: APP_ORIGIN,
      publicKey: LOCKED_KEY,
    };
    const strangerTarget = await signedInAs(t, STRANGER._id).query(
      api.team_access.connect.getTarget,
      { origin: APP_ORIGIN, publicKey: LOCKED_KEY }
    );

    expect(strangerTarget?.isMember).toBe(false);
    await expect(
      signedInAs(t, STRANGER._id).action(api.team_access.connect.approve, args)
    ).rejects.toThrow("not a member");
    await expect(
      t.action(api.team_access.connect.approve, args)
    ).rejects.toThrow("Not authenticated");
    expect(await storedCodeOrigins(t)).toEqual([]);
  });
});
