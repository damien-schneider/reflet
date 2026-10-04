/// <reference types="vite/client" />
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "../../_generated/api";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const ADMIN = { _id: "user_admin", email: "admin@example.com" };
const HOUR_MS = 60 * 60 * 1000;

const setup = async () => {
  const t = setupTest({ authUsers: [ADMIN] });
  const organizationId = await t.run(async (ctx) => {
    const orgId = await seedOrganization(ctx);
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId: orgId,
      role: "admin",
      userId: ADMIN._id,
    });
    return orgId;
  });
  const admin = t.withIdentity({ sessionId: ADMIN._id, subject: ADMIN._id });
  return { admin, organizationId, t };
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test("a release published early and then unpublished is not republished by the missed-schedule cron", async () => {
  const { admin, organizationId, t } = await setup();
  const releaseId = await admin.mutation(api.changelog.mutations.create, {
    organizationId,
    title: "Scheduled",
  });
  await admin.mutation(api.changelog.scheduling.schedulePublish, {
    id: releaseId,
    scheduledPublishAt: Date.now() + HOUR_MS,
  });

  await admin.mutation(api.changelog.actions.publish, { id: releaseId });
  await admin.mutation(api.changelog.actions.unpublish, { id: releaseId });
  vi.setSystemTime(Date.now() + 2 * HOUR_MS);
  await t.mutation(
    internal.changelog.scheduling.checkMissedScheduledReleases,
    {}
  );

  const release = await t.run((ctx) => ctx.db.get(releaseId));
  expect(release?.publishedAt).toBeUndefined();
  expect(release?.scheduledPublishAt).toBeUndefined();
});

test("a version already used by another release of the organization is rejected", async () => {
  const { admin, organizationId } = await setup();
  await admin.mutation(api.changelog.mutations.create, {
    organizationId,
    title: "First",
    version: "v1.4.0",
  });
  const secondId = await admin.mutation(api.changelog.mutations.create, {
    organizationId,
    title: "Second",
  });

  await expect(
    admin.mutation(api.changelog.mutations.create, {
      organizationId,
      title: "Duplicate",
      version: "v1.4.0",
    })
  ).rejects.toThrow("already used");
  await expect(
    admin.mutation(api.changelog.mutations.update, {
      id: secondId,
      version: "v1.4.0",
    })
  ).rejects.toThrow("already used");
});

test("discarding retroactive drafts refuses a release that is already published", async () => {
  const { admin, organizationId, t } = await setup();
  const releaseId = await t.run((ctx) =>
    ctx.db.insert("releases", {
      createdAt: Date.now(),
      organizationId,
      publishedAt: Date.now(),
      retroactivelyGenerated: true,
      title: "Live history",
      updatedAt: Date.now(),
    })
  );

  await expect(
    admin.mutation(api.changelog.retroactive.discardRetroactiveDrafts, {
      releaseIds: [releaseId],
    })
  ).rejects.toThrow("not an unpublished retroactive draft");
  expect(await t.run((ctx) => ctx.db.get(releaseId))).not.toBeNull();
});
