/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const INCIDENT_EMAIL = "email/renderer:sendStatusIncidentEmail";
const OWNER = { _id: "user_owner", email: "owner@example.com" };
const MEMBER_ID = "user_member";
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
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId,
      role: "member",
      userId: MEMBER_ID,
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

  const deliverNotifications = async () => {
    for (const _hop of ["fan out", "subscriber page"]) {
      vi.runOnlyPendingTimers();
      await t.finishInProgressScheduledFunctions();
    }
  };
  const emailedSubscribers = () =>
    t.run(async (ctx) => {
      const jobs = await ctx.db.system.query("_scheduled_functions").collect();
      return jobs
        .filter((job) => job.name === INCIDENT_EMAIL)
        .map((job) => job.args[0].to);
    });
  const teamNotifications = () =>
    t.run(async (ctx) => {
      const notifications = await ctx.db.query("notifications").collect();
      return notifications.map(({ type, userId }) => ({ type, userId }));
    });
  const declareIncident = (affectedMonitorIds: Id<"statusMonitors">[]) =>
    owner.mutation(api.status.incidents.createIncident, {
      affectedMonitorIds,
      message: "Investigating elevated errors",
      organizationId: ids.organizationId,
      severity: "major",
      title: "API errors",
    });

  return {
    ...ids,
    declareIncident,
    deliverNotifications,
    emailedSubscribers,
    owner,
    t,
    teamNotifications,
  };
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const AUTO_ANNOUNCE_DELAY_MS = 5 * 60 * 1000;

describe("status incident notifications", () => {
  test("a public incident emails confirmed subscribers at every step and alerts admins on open and resolve", async () => {
    const {
      declareIncident,
      deliverNotifications,
      emailedSubscribers,
      owner,
      publicMonitorId,
      teamNotifications,
    } = await setup();

    const incidentId = await declareIncident([publicMonitorId]);
    await deliverNotifications();

    expect(await emailedSubscribers()).toEqual([CONFIRMED]);
    expect(await teamNotifications()).toEqual([
      { type: "incident_detected", userId: OWNER._id },
    ]);

    await owner.mutation(api.status.incidents.postIncidentUpdate, {
      incidentId,
      message: "Root cause found",
      status: "identified",
    });
    await deliverNotifications();

    expect(await emailedSubscribers()).toEqual([CONFIRMED, CONFIRMED]);
    expect(await teamNotifications()).toHaveLength(1);

    await owner.mutation(api.status.incidents.postIncidentUpdate, {
      incidentId,
      message: "Fixed",
      status: "resolved",
    });
    await deliverNotifications();

    expect(await emailedSubscribers()).toEqual([
      CONFIRMED,
      CONFIRMED,
      CONFIRMED,
    ]);
    expect(await teamNotifications()).toEqual([
      { type: "incident_detected", userId: OWNER._id },
      { type: "incident_resolved", userId: OWNER._id },
    ]);
  });

  test("an incident on private monitors only emails nobody but still alerts admins", async () => {
    const {
      declareIncident,
      deliverNotifications,
      emailedSubscribers,
      privateMonitorId,
      teamNotifications,
    } = await setup();

    await declareIncident([privateMonitorId]);
    await deliverNotifications();

    expect(await emailedSubscribers()).toEqual([]);
    expect(await teamNotifications()).toEqual([
      { type: "incident_detected", userId: OWNER._id },
    ]);
  });

  test("a monitor that recovers within minutes never emails subscribers", async () => {
    const {
      deliverNotifications,
      emailedSubscribers,
      publicMonitorId,
      t,
      teamNotifications,
    } = await setup();
    const recordCheck = (isUp: boolean) =>
      t.mutation(internal.status.healthCheck.recordCheck, {
        isUp,
        monitorId: publicMonitorId,
      });

    for (const _flap of [1, 2, 3]) {
      for (const _failure of [1, 2, 3]) {
        await recordCheck(false);
      }
      await recordCheck(true);
      await deliverNotifications();
    }
    vi.advanceTimersByTime(AUTO_ANNOUNCE_DELAY_MS);
    await deliverNotifications();

    expect(await emailedSubscribers()).toEqual([]);
    expect(await teamNotifications()).toHaveLength(6);
  });

  test("a lasting automatic outage emails subscribers once announced and again on recovery", async () => {
    const { deliverNotifications, emailedSubscribers, publicMonitorId, t } =
      await setup();
    const recordCheck = (isUp: boolean) =>
      t.mutation(internal.status.healthCheck.recordCheck, {
        isUp,
        monitorId: publicMonitorId,
      });

    for (const _failure of [1, 2, 3]) {
      await recordCheck(false);
    }
    await deliverNotifications();
    expect(await emailedSubscribers()).toEqual([]);

    vi.advanceTimersByTime(AUTO_ANNOUNCE_DELAY_MS);
    await deliverNotifications();
    expect(await emailedSubscribers()).toEqual([CONFIRMED]);

    await recordCheck(true);
    await deliverNotifications();
    expect(await emailedSubscribers()).toEqual([CONFIRMED, CONFIRMED]);
  });
});
