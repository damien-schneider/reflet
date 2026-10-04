/// <reference types="vite/client" />
import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const DAY_MS = 24 * 60 * 60 * 1000;
const RAW_CHECK_SPACING_MS = 2000;
const ADMIN = { _id: "user_admin", email: "admin@example.com" };

const seedMonitor = (ctx: MutationCtx, organizationId: Id<"organizations">) =>
  ctx.db.insert("statusMonitors", {
    alertThreshold: 3,
    checkIntervalMinutes: 5,
    consecutiveFailures: 0,
    createdAt: Date.now(),
    isPublic: true,
    name: "API",
    organizationId,
    status: "operational",
    updatedAt: Date.now(),
    url: "https://api.example.com/",
  });

const setup = async (options: Parameters<typeof setupTest>[0] = {}) => {
  const t = setupTest({ authUsers: [ADMIN], ...options });
  const { monitorId, organizationId } = await t.run(async (ctx) => {
    const orgId = await seedOrganization(ctx);
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId: orgId,
      role: "owner",
      userId: ADMIN._id,
    });
    return { monitorId: await seedMonitor(ctx, orgId), organizationId: orgId };
  });
  const recordCheck = (isUp: boolean, responseTimeMs?: number) =>
    t.mutation(internal.status.healthCheck.recordCheck, {
      isUp,
      monitorId,
      responseTimeMs,
    });
  return { monitorId, organizationId, recordCheck, t };
};

afterEach(() => {
  vi.useRealTimers();
});

describe("status history", () => {
  test("public uptime and latency reflect recorded checks", async () => {
    const { monitorId, recordCheck, t } = await setup();
    await recordCheck(true, 120);
    await recordCheck(true, 80);
    await recordCheck(false, 10_000);

    const bars = await t.query(api.status.publicQueries.getPublicUptimeBars, {
      orgSlug: "acme",
    });
    const status = await t.query(api.status.publicQueries.getPublicStatus, {
      orgSlug: "acme",
    });

    expect(bars?.[monitorId]).toMatchObject({
      days: [{ uptimePercentage: 66.67 }],
      overallUptime: 66.67,
    });
    expect(status?.monitorGroups[0]?.monitors[0]?.latencyByHour).toMatchObject([
      { responseTimeMs: 100 },
    ]);
  });

  test("the public page keeps loading past Convex's read limit of raw checks in one day", async () => {
    const { monitorId, organizationId, t } = await setup({
      enforceTransactionLimits: true,
    });
    const now = Date.now();
    const rawChecksPerBatch = 10_000;
    for (let batch = 0; batch < 4; batch++) {
      await t.run(async (ctx) => {
        for (let i = 0; i < rawChecksPerBatch; i++) {
          const checkIndex = batch * rawChecksPerBatch + i;
          await ctx.db.insert("statusChecks", {
            checkedAt: now - checkIndex * RAW_CHECK_SPACING_MS,
            isUp: true,
            monitorId,
            organizationId,
            responseTimeMs: 120,
          });
        }
      });
    }

    await expect(
      t.query(api.status.publicQueries.getPublicUptimeBars, { orgSlug: "acme" })
    ).resolves.toBeDefined();
    await expect(
      t.query(api.status.publicQueries.getPublicStatus, { orgSlug: "acme" })
    ).resolves.toBeDefined();
  });

  test("pruning drops old raw checks but keeps their daily uptime", async () => {
    vi.useFakeTimers();
    const now = Date.now();
    const { monitorId, recordCheck, t } = await setup();
    vi.setSystemTime(now - 3 * DAY_MS);
    await recordCheck(false);
    vi.setSystemTime(now);
    await recordCheck(true, 50);

    await t.mutation(internal.status.history.pruneStatusHistory, {});

    const rawChecks = await t.run((ctx) =>
      ctx.db.query("statusChecks").collect()
    );
    const bars = await t.query(api.status.publicQueries.getPublicUptimeBars, {
      orgSlug: "acme",
    });
    expect(rawChecks).toMatchObject([{ isUp: true }]);
    expect(bars?.[monitorId]).toMatchObject({
      days: [{ uptimePercentage: 0 }, { uptimePercentage: 100 }],
      overallUptime: 50,
    });
  });

  test("deleting a monitor purges its history", async () => {
    vi.useFakeTimers();
    const { monitorId, recordCheck, t } = await setup();
    await recordCheck(true, 50);
    const admin = t.withIdentity({ sessionId: ADMIN._id, subject: ADMIN._id });

    await admin.mutation(api.status.monitors.deleteMonitor, { monitorId });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const leftovers = await t.run(async (ctx) => [
      ...(await ctx.db.query("statusChecks").collect()),
      ...(await ctx.db.query("statusUptimeHours").collect()),
      ...(await ctx.db.query("statusUptimeDays").collect()),
    ]);
    expect(leftovers).toEqual([]);
  });
});
