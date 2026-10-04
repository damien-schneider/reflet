/// <reference types="vite/client" />
import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../../_generated/api";
import { PLAN_LIMITS } from "../../billing/queries";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const ADMIN = { _id: "user_admin", email: "admin@example.com" };

const setup = async (stripeSubscriptionStatus: string | null = null) => {
  const t = setupTest({ authUsers: [ADMIN], stripeSubscriptionStatus });
  const organizationId = await t.run(async (ctx) => {
    const orgId = await seedOrganization(ctx);
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId: orgId,
      role: "owner",
      userId: ADMIN._id,
    });
    return orgId;
  });
  const admin = t.withIdentity({ sessionId: ADMIN._id, subject: ADMIN._id });
  return { admin, organizationId, t };
};

afterEach(() => {
  vi.useRealTimers();
});

describe("status monitors", () => {
  test.each([
    "http://169.254.169.254/latest/meta-data/",
    "http://localhost:3210/",
    "http://[::1]/",
  ])("rejects monitoring %s", async (url) => {
    const { admin, organizationId } = await setup();

    await expect(
      admin.mutation(api.status.monitors.createMonitor, {
        name: "Internal",
        organizationId,
        url,
      })
    ).rejects.toThrow(/public/);
  });

  test("rejects switching a monitor to an internal URL", async () => {
    const { admin, organizationId } = await setup();
    const monitorId = await admin.mutation(api.status.monitors.createMonitor, {
      name: "API",
      organizationId,
      url: "https://api.example.com/health",
    });

    await expect(
      admin.mutation(api.status.monitors.updateMonitor, {
        monitorId,
        url: "http://192.168.1.1/",
      })
    ).rejects.toThrow(/public/);
  });

  test("caps free organizations at the plan's monitor limit", async () => {
    const { admin, organizationId } = await setup();
    for (let i = 0; i < PLAN_LIMITS.free.maxMonitors; i++) {
      await admin.mutation(api.status.monitors.createMonitor, {
        name: `Service ${i}`,
        organizationId,
        url: `https://service-${i}.example.com/`,
      });
    }

    await expect(
      admin.mutation(api.status.monitors.createMonitor, {
        name: "One too many",
        organizationId,
        url: "https://extra.example.com/",
      })
    ).rejects.toThrow(`up to ${PLAN_LIMITS.free.maxMonitors} monitors`);
  });

  test("lets pro organizations go past the free monitor limit", async () => {
    const { admin, organizationId, t } = await setup("active");
    for (let i = 0; i <= PLAN_LIMITS.free.maxMonitors; i++) {
      await admin.mutation(api.status.monitors.createMonitor, {
        name: `Service ${i}`,
        organizationId,
        url: `https://service-${i}.example.com/`,
      });
    }

    const count = await t.run(
      async (ctx) => (await ctx.db.query("statusMonitors").collect()).length
    );
    expect(count).toBe(PLAN_LIMITS.free.maxMonitors + 1);
  });

  test("aggregate status ignores private monitors", async () => {
    const { admin, organizationId, t } = await setup();
    await admin.mutation(api.status.monitors.createMonitor, {
      isPublic: false,
      name: "Internal admin",
      organizationId,
      url: "https://admin.example.com/",
    });
    await t.run(async (ctx) => {
      const monitor = await ctx.db.query("statusMonitors").first();
      if (monitor) {
        await ctx.db.patch(monitor._id, { status: "major_outage" });
      }
    });

    const status = await t.query(api.status.monitors.getAggregateStatus, {
      organizationId,
    });
    expect(status).toEqual({ monitorCount: 0, status: "no_monitors" });
  });

  test("an outage incident still resolves when a down monitor was paused and resumed", async () => {
    vi.useFakeTimers();
    const { admin, organizationId, t } = await setup();
    const monitorId = await admin.mutation(api.status.monitors.createMonitor, {
      name: "API",
      organizationId,
      url: "https://api.example.com/",
    });
    for (const _failure of [1, 2, 3]) {
      await t.mutation(internal.status.healthCheck.recordCheck, {
        isUp: false,
        monitorId,
      });
    }

    await admin.mutation(api.status.monitors.setMonitorPaused, {
      monitorId,
      paused: true,
    });
    await admin.mutation(api.status.monitors.setMonitorPaused, {
      monitorId,
      paused: false,
    });
    await t.mutation(internal.status.healthCheck.recordCheck, {
      isUp: true,
      monitorId,
    });

    const incidents = await t.run((ctx) =>
      ctx.db.query("statusIncidents").collect()
    );
    expect(incidents).toMatchObject([{ status: "resolved" }]);
  });

  test("a slow but successful response degrades the monitor without counting a failure", async () => {
    const { admin, organizationId, t } = await setup();
    const monitorId = await admin.mutation(api.status.monitors.createMonitor, {
      name: "API",
      organizationId,
      url: "https://api.example.com/",
    });
    await admin.mutation(api.status.monitors.updateMonitor, {
      degradedResponseTimeMs: 1000,
      monitorId,
    });

    await t.mutation(internal.status.healthCheck.recordCheck, {
      isUp: true,
      monitorId,
      responseTimeMs: 2500,
    });

    const monitor = await t.run((ctx) => ctx.db.get(monitorId));
    expect(monitor).toMatchObject({
      consecutiveFailures: 0,
      status: "degraded",
    });
  });

  test("a private organization's status stays hidden from the public", async () => {
    const { admin, organizationId, t } = await setup();
    await admin.mutation(api.status.monitors.createMonitor, {
      name: "API",
      organizationId,
      url: "https://api.example.com/",
    });
    await t.run((ctx) => ctx.db.patch(organizationId, { isPublic: false }));

    const publicStatus = await t.query(
      api.status.publicQueries.getPublicStatus,
      { orgSlug: "acme" }
    );
    const memberPreview = await admin.query(
      api.status.publicQueries.getPublicStatus,
      { orgSlug: "acme" }
    );
    expect(publicStatus).toBeNull();
    expect(memberPreview?.overallStatus).toBe("operational");
  });
});
