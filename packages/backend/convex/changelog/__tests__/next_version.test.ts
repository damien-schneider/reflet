/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { api } from "../../_generated/api";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const member = { _id: "user_member", email: "member@example.com" };
const outsider = { _id: "user_outsider", email: "outsider@example.com" };

const seedPrivateOrgWithRelease = async () => {
  const t = setupTest({ authUsers: [member, outsider] });
  const organizationId = await t.run(async (ctx) => {
    const orgId = await seedOrganization(ctx, { isPublic: false });
    const now = Date.now();
    await ctx.db.insert("organizationMembers", {
      createdAt: now,
      organizationId: orgId,
      role: "member",
      userId: member._id,
    });
    await ctx.db.insert("releases", {
      createdAt: now,
      organizationId: orgId,
      publishedAt: now,
      title: "Big release",
      updatedAt: now,
      version: "v2.4.1",
    });
    return orgId;
  });
  const as = (userId: string) =>
    t.withIdentity({ sessionId: userId, subject: userId });
  return { as, organizationId, t };
};

test("members read the latest version and its suggestions", async () => {
  const { as, organizationId } = await seedPrivateOrgWithRelease();

  const suggestions = await as(member._id).query(
    api.changelog.queries.getNextVersion,
    { organizationId }
  );

  expect(suggestions.current).toBe("v2.4.1");
  expect(suggestions.patch).toBe("v2.4.2");
});

test("non-members and anonymous callers never see a private org's versions", async () => {
  const { as, organizationId, t } = await seedPrivateOrgWithRelease();

  for (const caller of [as(outsider._id), t]) {
    const suggestions = await caller.query(
      api.changelog.queries.getNextVersion,
      { organizationId }
    );
    expect(suggestions.current).toBeNull();
    expect(suggestions.patch).toBeNull();
  }
});
