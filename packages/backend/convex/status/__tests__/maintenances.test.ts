/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MAINTENANCE_EMAIL = "email/renderer:sendStatusMaintenanceEmail";
const OWNER = { _id: "user_owner", email: "owner@example.com" };
const CONFIRMED = "confirmed@example.com";
const UNCONFIRMED = "unconfirmed@example.com";

const seedMonitor = (
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  isPublic: boolean
) =>
  ctx.db.insert("statusMonitors", {
    alertThreshold: 3,
    checkIntervalMinutes: 5,
    consecutiveFailures: 0,
    createdAt: Date.now(),
    isPublic,
    name: isPublic ? "API" : "Internal worker",
    organizationId,
    status: "operational",
    updatedAt: Date.now(),
    url: "https://acme.example.com/health",
  });

const setup = async () => {
  const t = setupTest({ authUsers: [OWNER] });
  const ids = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId,
      role: "owner",
      userId: OWNER._id,
    });
    for (const email of [CONFIRMED, UNCONFIRMED]) {
      await ctx.db.insert("statusSubscribers", {
        confirmationToken: email === UNCONFIRMED ? "pending" : undefined,
        email,
        organizationId,
        subscribedAt: Date.now(),
        unsubscribeToken: `unsubscribe-${email}`,
      });
    }
    return {
      organizationId,
      privateMonitorId: await seedMonitor(ctx, organizationId, false),
      publicMonitorId: await seedMonitor(ctx, organizationId, true),
    };
  });
  const owner = t.withIdentity({ sessionId: OWNER._id, subject: OWNER._id });

  const scheduleMaintenance = (
    title: string,
    affectedMonitorIds: Id<"statusMonitors">[],
    window: { endsAt: number; startsAt: number }
  ) =>
    owner.mutation(api.status.maintenances.scheduleMaintenance, {
      affectedMonitorIds,
      message: "Database upgrade",
      organizationId: ids.organizationId,
      title,
      ...window,
    });
  const failChecks = async (count: number) => {
    for (let check = 0; check < count; check++) {
      await t.mutation(internal.status.healthCheck.recordCheck, {
        isUp: false,
        monitorId: ids.publicMonitorId,
      });
    }
  };
  const incidents = () =>
    t.run(async (ctx) => {
      const all = await ctx.db.query("statusIncidents").collect();
      return all.map(({ affectedMonitorIds, status }) => ({
        affectedMonitorIds,
        status,
      }));
    });
  const emailedSubscribers = () =>
    t.run(async (ctx) => {
      const jobs = await ctx.db.system.query("_scheduled_functions").collect();
      return jobs
        .filter((job) => job.name === MAINTENANCE_EMAIL)
        .map((job) => job.args[0].to);
    });

  return {
    ...ids,
    emailedSubscribers,
    failChecks,
    incidents,
    scheduleMaintenance,
    t,
  };
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("status maintenances", () => {
  test("an outage during maintenance opens no incident until the window closes", async () => {
    const { failChecks, incidents, publicMonitorId, scheduleMaintenance, t } =
      await setup();
    const now = Date.now();
    await scheduleMaintenance("Database upgrade", [publicMonitorId], {
      endsAt: now + HOUR_MS,
      startsAt: now,
    });

    await failChecks(4);

    const recordedChecks = await t.run((ctx) =>
      ctx.db.query("statusChecks").collect()
    );
    expect(recordedChecks).toHaveLength(4);
    expect(await incidents()).toEqual([]);

    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(await incidents()).toEqual([
      { affectedMonitorIds: [publicMonitorId], status: "investigating" },
    ]);
  });

  test("the public page shows public maintenances and reports affected monitors as under maintenance", async () => {
    const {
      failChecks,
      organizationId,
      privateMonitorId,
      publicMonitorId,
      scheduleMaintenance,
      t,
    } = await setup();
    const now = Date.now();
    await scheduleMaintenance("API upgrade", [publicMonitorId], {
      endsAt: now + HOUR_MS,
      startsAt: now,
    });
    await scheduleMaintenance("Worker upgrade", [privateMonitorId], {
      endsAt: now + HOUR_MS,
      startsAt: now,
    });
    await scheduleMaintenance("Network move", [], {
      endsAt: now + 2 * DAY_MS + HOUR_MS,
      startsAt: now + 2 * DAY_MS,
    });
    await scheduleMaintenance("Datacenter move", [], {
      endsAt: now + 30 * DAY_MS + HOUR_MS,
      startsAt: now + 30 * DAY_MS,
    });
    await failChecks(3);

    const status = await t.query(api.status.publicQueries.getPublicStatus, {
      orgSlug: "acme",
    });
    const aggregate = await t.query(api.status.monitors.getAggregateStatus, {
      organizationId,
    });

    expect(status?.maintenances).toMatchObject([
      { affectedMonitors: ["API"], isActive: true, title: "API upgrade" },
      { affectedMonitors: [], isActive: false, title: "Network move" },
    ]);
    expect(status?.monitorGroups[0]?.monitors).toMatchObject([
      { name: "API", status: "maintenance" },
    ]);
    expect(status?.overallStatus).toBe("maintenance");
    expect(aggregate.status).toBe("maintenance");
  });

  test("scheduling a public maintenance emails confirmed subscribers only", async () => {
    const {
      emailedSubscribers,
      privateMonitorId,
      publicMonitorId,
      scheduleMaintenance,
      t,
    } = await setup();
    const now = Date.now();
    await scheduleMaintenance("Worker upgrade", [privateMonitorId], {
      endsAt: now + 2 * HOUR_MS,
      startsAt: now + HOUR_MS,
    });
    await scheduleMaintenance("API upgrade", [publicMonitorId], {
      endsAt: now + 2 * HOUR_MS,
      startsAt: now + HOUR_MS,
    });

    await t.finishInProgressScheduledFunctions();
    vi.advanceTimersByTime(0);
    await t.finishInProgressScheduledFunctions();

    expect(await emailedSubscribers()).toEqual([CONFIRMED]);
  });
});
