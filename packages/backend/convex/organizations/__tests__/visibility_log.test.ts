import { expect, test } from "vitest";
import { api, internal } from "../../_generated/api";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const OWNER = { _id: "user_owner", email: "owner@acme.test", name: "Owner" };

const setup = async () => {
  const t = setupTest({ authUsers: [OWNER] });
  const organizationId = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx, { isPublic: true });
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId,
      role: "owner",
      userId: OWNER._id,
    });
    return organizationId;
  });
  const owner = t.withIdentity({ sessionId: OWNER._id, subject: OWNER._id });
  const visibilityLogs = () =>
    t.run(async (ctx) =>
      (await ctx.db.query("activityLogs").collect()).filter(
        (log) => log.action === "visibility_changed"
      )
    );
  return { organizationId, owner, t, visibilityLogs };
};

test("an owner taking the board private leaves an audit row naming them", async () => {
  const { organizationId, owner, visibilityLogs } = await setup();

  await owner.mutation(api.organizations.mutations.update, {
    id: organizationId,
    isPublic: false,
  });

  expect(await visibilityLogs()).toMatchObject([
    {
      authorId: OWNER._id,
      details: JSON.stringify({ current: "private", previous: "public" }),
      organizationId,
    },
  ]);
});

test("updates that keep visibility as it is leave no audit row", async () => {
  const { organizationId, owner, visibilityLogs } = await setup();

  await owner.mutation(api.organizations.mutations.update, {
    id: organizationId,
    isPublic: true,
    name: "Acme Corp",
  });

  expect(await visibilityLogs()).toEqual([]);
});

test("the admin API flipping visibility is attributed to the API", async () => {
  const { organizationId, t, visibilityLogs } = await setup();

  await t.mutation(internal.admin_api.organization.updateOrganization, {
    isPublic: false,
    organizationId,
  });

  expect(await visibilityLogs()).toMatchObject([{ authorId: "api" }]);
});
