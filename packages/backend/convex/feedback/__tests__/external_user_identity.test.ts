import { describe, expect, it } from "vitest";
import { internal } from "../../_generated/api";
import { rateLimiter } from "../../shared/rate_limits";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const UNSIGNED_USERS_PER_ORG_BURST = 500;

async function setup() {
  const t = setupTest();
  const organizationId = await t.run((ctx) => seedOrganization(ctx));
  const identify = (
    user: { email?: string; externalId: string; name?: string },
    verified: boolean
  ) =>
    t.mutation(internal.feedback.api_auth.getOrCreateExternalUser, {
      ...user,
      organizationId,
      verified,
    });
  const storedUser = () =>
    t.run((ctx) => ctx.db.query("externalUsers").unique());
  const drainUnsignedUserBudget = (remaining: number) =>
    t.run((ctx) =>
      rateLimiter.limit(ctx, "unsignedExternalUserPerOrg", {
        count: UNSIGNED_USERS_PER_ORG_BURST - remaining,
        key: organizationId,
      })
    );
  return { drainUnsignedUserBudget, identify, storedUser };
}

describe("external user identity", () => {
  it("never lets an unsigned token take over a user a signed token established", async () => {
    const { identify, storedUser } = await setup();
    await identify(
      { email: "ada@acme.test", externalId: "1042", name: "Ada" },
      true
    );

    const forged = await identify(
      { email: "attacker@evil.test", externalId: "1042", name: "Support" },
      false
    );

    expect(forged).toBeNull();
    expect(await storedUser()).toMatchObject({
      email: "ada@acme.test",
      name: "Ada",
      verified: true,
    });
  });

  it("does not let an unsigned token edit an existing unsigned user", async () => {
    const { identify, storedUser } = await setup();
    const userId = await identify({ externalId: "v1", name: "Léa" }, false);

    const again = await identify({ externalId: "v1", name: "Renamed" }, false);

    expect(again).toBe(userId);
    expect(await storedUser()).toMatchObject({ name: "Léa", verified: false });
  });

  it("lets a signed token claim and update a user first seen unsigned", async () => {
    const { identify, storedUser } = await setup();
    const userId = await identify({ externalId: "u7", name: "Old" }, false);

    const signedId = await identify({ externalId: "u7", name: "New" }, true);

    expect(signedId).toBe(userId);
    expect(await storedUser()).toMatchObject({ name: "New", verified: true });
    expect(await identify({ externalId: "u7" }, false)).toBeNull();
  });

  it("drops the unsigned email and name when the signed token omits them", async () => {
    const { identify, storedUser } = await setup();
    await identify(
      { email: "attacker@evil.test", externalId: "u8", name: "Support" },
      false
    );

    await identify({ externalId: "u8" }, true);

    const user = await storedUser();
    expect(user?.email).toBeUndefined();
    expect(user?.name).toBeUndefined();
    expect(user?.verified).toBe(true);
  });

  it("keeps a signed profile when a later signed token omits fields", async () => {
    const { identify, storedUser } = await setup();
    await identify(
      { email: "ada@acme.test", externalId: "u9", name: "Ada" },
      true
    );

    await identify({ externalId: "u9" }, true);

    expect(await storedUser()).toMatchObject({
      email: "ada@acme.test",
      name: "Ada",
    });
  });

  it("stops creating unsigned users past the per-organization burst", async () => {
    const { drainUnsignedUserBudget, identify } = await setup();
    await drainUnsignedUserBudget(1);

    expect(await identify({ externalId: "bot-last" }, false)).not.toBeNull();
    expect(await identify({ externalId: "bot-overflow" }, false)).toBeNull();
    expect(await identify({ externalId: "signed" }, true)).not.toBeNull();
  });
});
