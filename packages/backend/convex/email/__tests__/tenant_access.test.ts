/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { api } from "../../_generated/api";
import { PLATFORM_ADMIN_ISSUER } from "../../shared/platform_admin";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const TENANT_ADMIN = { _id: "user_tenant", email: "owner@tenant.test" };
const OUTSIDER = { _id: "user_out", email: "out@else.test" };

const setup = async () => {
  const t = setupTest({ authUsers: [TENANT_ADMIN, OUTSIDER] });
  const seeded = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId,
      role: "owner",
      userId: TENANT_ADMIN._id,
    });
    const suppressionId = await ctx.db.insert("emailSuppressions", {
      email: "complainer@other-tenant.test",
      originalEventType: "email.complained",
      reason: "complaint",
      suppressedAt: Date.now(),
    });
    const releaseId = await ctx.db.insert("releases", {
      createdAt: Date.now(),
      organizationId,
      title: "v1",
      updatedAt: Date.now(),
    });
    await ctx.db.insert("emailSendLog", {
      emailType: "changelog_notification",
      organizationId,
      releaseId,
      sentAt: Date.now(),
      status: "delivered",
      subject: "v1 is out",
      to: "subscriber@customer.test",
    });
    return { organizationId, releaseId, suppressionId };
  });
  const as = (userId: string) =>
    t.withIdentity({ sessionId: userId, subject: userId });
  return { ...seeded, as, t };
};

test("an org owner cannot read or edit the platform-wide suppression list", async () => {
  const { as, suppressionId, t } = await setup();
  const tenant = as(TENANT_ADMIN._id);

  await expect(
    tenant.query(api.email.suppression.listSuppressions, {})
  ).rejects.toThrow("Not authorized");
  await expect(
    tenant.mutation(api.email.suppression.removeSuppression, { suppressionId })
  ).rejects.toThrow("Not authorized");
  await expect(
    tenant.mutation(api.email.suppression.addSuppression, {
      email: "victim@corp.test",
    })
  ).rejects.toThrow("Not authorized");
  expect(await t.run((ctx) => ctx.db.get(suppressionId))).not.toBeNull();

  const platform = t.withIdentity({
    issuer: PLATFORM_ADMIN_ISSUER,
    subject: "damien-schneider",
  });
  const listed = await platform.query(
    api.email.suppression.listSuppressions,
    {}
  );
  expect(listed.map((row) => row.email)).toEqual([
    "complainer@other-tenant.test",
  ]);
  await platform.mutation(api.email.suppression.removeSuppression, {
    suppressionId,
  });
  expect(await t.run((ctx) => ctx.db.get(suppressionId))).toBeNull();
});

test("a signed-in outsider cannot read another org's email analytics", async () => {
  const { as, organizationId, releaseId } = await setup();
  const outsider = as(OUTSIDER._id);

  await expect(
    outsider.query(api.email.analytics.getRecentEmails, { organizationId })
  ).rejects.toThrow("You don't have access to this organization");
  await expect(
    outsider.query(api.email.analytics.getEmailStats, { organizationId })
  ).rejects.toThrow("You don't have access to this organization");
  await expect(
    outsider.query(api.email.analytics.getReleaseEmailStats, { releaseId })
  ).rejects.toThrow("You don't have access to this organization");

  const owner = as(TENANT_ADMIN._id);
  const recent = await owner.query(api.email.analytics.getRecentEmails, {
    organizationId,
  });
  expect(recent.map((email) => email.to)).toEqual(["subscriber@customer.test"]);
  const releaseStats = await owner.query(
    api.email.analytics.getReleaseEmailStats,
    { releaseId }
  );
  expect(releaseStats.total).toBe(1);
});
