/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { api } from "../../_generated/api";
import { seedGithubConnection, seedOrganization } from "../../test.fixtures";
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

test("an unpublished draft's version is never suggested again, but is not shown as the latest release", async () => {
  const { as, organizationId, t } = await seedPrivateOrgWithRelease();
  const draftId = await t.run((ctx) =>
    ctx.db.insert("releases", {
      createdAt: Date.now(),
      organizationId,
      title: "Next release",
      updatedAt: Date.now(),
      version: "v2.4.2",
    })
  );

  const forNewRelease = await as(member._id).query(
    api.changelog.queries.getNextVersion,
    { organizationId }
  );
  const forTheDraft = await as(member._id).query(
    api.changelog.queries.getNextVersion,
    { excludeReleaseId: draftId, organizationId }
  );

  expect(forNewRelease.current).toBe("v2.4.1");
  expect(forNewRelease.patch).toBe("v2.4.3");
  expect(forTheDraft.patch).toBe("v2.4.2");
});

test("the latest version also counts published GitHub tags and skips non-semver names", async () => {
  const { as, organizationId, t } = await seedPrivateOrgWithRelease();
  await t.run(async (ctx) => {
    const githubConnectionId = await seedGithubConnection(ctx, organizationId);
    const now = Date.now();
    const tags = [
      { isDraft: false, tagName: "@acme/app@2.10.0" },
      { isDraft: true, tagName: "v9.0.0" },
      { isDraft: false, tagName: "2024-W05" },
    ];
    for (const { isDraft, tagName } of tags) {
      await ctx.db.insert("githubReleases", {
        createdAt: now,
        githubConnectionId,
        githubReleaseId: tagName,
        htmlUrl: `https://github.com/acme/app/releases/tag/${tagName}`,
        isDraft,
        isPrerelease: false,
        lastSyncedAt: now,
        organizationId,
        tagName,
      });
    }
  });

  const suggestions = await as(member._id).query(
    api.changelog.queries.getNextVersion,
    { organizationId }
  );

  expect(suggestions.current).toBe("@acme/app@2.10.0");
  expect(suggestions.minor).toBe("v2.11.0");
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
