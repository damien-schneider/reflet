import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "../../_generated/api";
import schema from "../../schema";
import { seedOrganization } from "../../test.fixtures";
import { modules } from "../../test.helpers";

async function setup() {
  const t = convexTest(schema, modules);
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
  return { identify, storedUser };
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
});
