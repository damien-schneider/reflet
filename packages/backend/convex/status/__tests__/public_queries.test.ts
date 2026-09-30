/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const seedMonitor = (
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  monitor: { isPublic: boolean; name: string }
) =>
  ctx.db.insert("statusMonitors", {
    alertThreshold: 3,
    checkIntervalMinutes: 5,
    consecutiveFailures: 0,
    createdAt: Date.now(),
    organizationId,
    status: "operational",
    updatedAt: Date.now(),
    url: "https://example.com/",
    ...monitor,
  });

const seedIncident = (
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  incident: {
    affectedMonitorIds: Id<"statusMonitors">[];
    status: "investigating" | "resolved";
    title: string;
  }
) =>
  ctx.db.insert("statusIncidents", {
    autoDetected: true,
    createdAt: Date.now(),
    organizationId,
    severity: "major",
    startedAt: Date.now(),
    updatedAt: Date.now(),
    ...incident,
  });

const setup = async () => {
  const t = setupTest();
  await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    const publicId = await seedMonitor(ctx, organizationId, {
      isPublic: true,
      name: "Website",
    });
    const privateId = await seedMonitor(ctx, organizationId, {
      isPublic: false,
      name: "Secret billing cluster",
    });
    for (const status of ["investigating", "resolved"] as const) {
      await seedIncident(ctx, organizationId, {
        affectedMonitorIds: [privateId],
        status,
        title: "Secret billing cluster is experiencing issues",
      });
      await seedIncident(ctx, organizationId, {
        affectedMonitorIds: [publicId, privateId],
        status,
        title: "Website is experiencing issues",
      });
    }
  });
  return t;
};

describe("public status page", () => {
  test("only shows active incidents touching public monitors", async () => {
    const t = await setup();

    const status = await t.query(api.status.publicQueries.getPublicStatus, {
      orgSlug: "acme",
    });

    expect(status?.activeIncidents).toMatchObject([
      {
        affectedMonitors: ["Website"],
        title: "Website is experiencing issues",
      },
    ]);
  });

  test("history hides private incidents and private monitor names", async () => {
    const t = await setup();

    const history = await t.query(
      api.status.publicQueries.getPublicIncidentHistory,
      { orgSlug: "acme" }
    );

    expect(history).toMatchObject([
      {
        affectedMonitors: ["Website"],
        title: "Website is experiencing issues",
      },
    ]);
  });
});
