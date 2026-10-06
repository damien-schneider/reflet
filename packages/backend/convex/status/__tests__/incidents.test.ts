/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { MAX_TITLE_LENGTH } from "../../shared/constants";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const MALLORY = { _id: "user_mallory", email: "mallory@example.com" };

const seedMonitor = (
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  url: string
) =>
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
    url,
  });

const setup = async () => {
  const t = setupTest({ authUsers: [MALLORY] });
  const ids = await t.run(async (ctx) => {
    const victimOrgId = await seedOrganization(ctx, { slug: "victim" });
    const malloryOrgId = await seedOrganization(ctx, { slug: "mallory" });
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId: malloryOrgId,
      role: "owner",
      userId: MALLORY._id,
    });
    return {
      malloryMonitorId: await seedMonitor(
        ctx,
        malloryOrgId,
        "https://mallory.example.com/"
      ),
      malloryOrgId,
      victimMonitorId: await seedMonitor(
        ctx,
        victimOrgId,
        "https://victim.example.com/health?token=secret"
      ),
    };
  });
  const mallory = t.withIdentity({
    sessionId: MALLORY._id,
    subject: MALLORY._id,
  });
  return { ...ids, mallory, t };
};

describe("status incidents", () => {
  test("refuses monitors from another organization", async () => {
    const { mallory, malloryOrgId, victimMonitorId } = await setup();

    await expect(
      mallory.mutation(api.status.incidents.createIncident, {
        affectedMonitorIds: [victimMonitorId],
        message: "Investigating",
        organizationId: malloryOrgId,
        severity: "minor",
        title: "Outage",
      })
    ).rejects.toThrow("Monitor not found");
  });

  test("refuses an oversized title", async () => {
    const { mallory, malloryMonitorId, malloryOrgId } = await setup();

    await expect(
      mallory.mutation(api.status.incidents.createIncident, {
        affectedMonitorIds: [malloryMonitorId],
        message: "Investigating",
        organizationId: malloryOrgId,
        severity: "minor",
        title: "x".repeat(MAX_TITLE_LENGTH + 1),
      })
    ).rejects.toThrow(/Title must be/);
  });

  test("accepts the organization's own monitors", async () => {
    const { mallory, malloryMonitorId, malloryOrgId } = await setup();

    const incidentId = await mallory.mutation(
      api.status.incidents.createIncident,
      {
        affectedMonitorIds: [malloryMonitorId],
        message: "Investigating",
        organizationId: malloryOrgId,
        severity: "minor",
        title: "Outage",
      }
    );

    const active = await mallory.query(
      api.status.incidents.getActiveIncidents,
      { organizationId: malloryOrgId }
    );
    const incident = active.find((candidate) => candidate._id === incidentId);
    expect(incident?.affectedMonitors.map((m) => m._id)).toEqual([
      malloryMonitorId,
    ]);
  });

  test("never returns a foreign monitor stored on an incident", async () => {
    const { mallory, malloryOrgId, t, victimMonitorId } = await setup();
    const incidentId = await t.run((ctx) =>
      ctx.db.insert("statusIncidents", {
        affectedMonitorIds: [victimMonitorId],
        autoDetected: false,
        createdAt: Date.now(),
        organizationId: malloryOrgId,
        severity: "minor",
        startedAt: Date.now(),
        status: "investigating",
        title: "Legacy incident",
        updatedAt: Date.now(),
      })
    );

    const active = await mallory.query(
      api.status.incidents.getActiveIncidents,
      { organizationId: malloryOrgId }
    );
    expect(active.map((incident) => incident._id)).toEqual([incidentId]);
    expect(active[0]?.affectedMonitors).toEqual([]);
  });
});
