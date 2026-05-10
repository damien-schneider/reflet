/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { api } from "../../_generated/api";
import {
  createMemberSession,
  createOrg,
  createTestContext,
} from "./test-fixtures.helpers";

describe("userViews", () => {
  test("personal view is owner-scoped", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const authedAlice = await createMemberSession(t, organizationId);
    const authedBob = await createMemberSession(t, organizationId);

    const viewId = await authedAlice.mutation(
      api.autopilot.mutations.views.createView,
      {
        organizationId,
        name: "My triage",
        scope: "personal",
        filtersJson: JSON.stringify({ status: ["triage"] }),
      }
    );

    const aliceViews = await authedAlice.query(
      api.autopilot.queries.views.listViews,
      { organizationId }
    );
    expect(aliceViews.map((v) => v._id)).toContain(viewId);

    const bobViews = await authedBob.query(
      api.autopilot.queries.views.listViews,
      { organizationId }
    );
    expect(bobViews.map((v) => v._id)).not.toContain(viewId);
  });

  test("shared view visible to all org members", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const authedAlice = await createMemberSession(t, organizationId);
    const authedBob = await createMemberSession(t, organizationId);

    const viewId = await authedAlice.mutation(
      api.autopilot.mutations.views.createView,
      {
        organizationId,
        name: "Team triage",
        scope: "shared",
        filtersJson: JSON.stringify({ status: ["triage"] }),
      }
    );

    const bobViews = await authedBob.query(
      api.autopilot.queries.views.listViews,
      { organizationId }
    );
    expect(bobViews.map((v) => v._id)).toContain(viewId);
  });

  test("personal view cannot be modified by another user", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const authedAlice = await createMemberSession(t, organizationId);
    const authedBob = await createMemberSession(t, organizationId);

    const viewId = await authedAlice.mutation(
      api.autopilot.mutations.views.createView,
      {
        organizationId,
        name: "Mine",
        scope: "personal",
        filtersJson: "{}",
      }
    );

    await expect(
      authedBob.mutation(api.autopilot.mutations.views.updateView, {
        viewId,
        name: "Hijacked",
      })
    ).rejects.toThrow();

    await expect(
      authedBob.mutation(api.autopilot.mutations.views.deleteView, { viewId })
    ).rejects.toThrow();
  });

  test("update + delete by owner succeeds", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const authed = await createMemberSession(t, organizationId);

    const viewId = await authed.mutation(
      api.autopilot.mutations.views.createView,
      {
        organizationId,
        name: "Initial",
        scope: "personal",
        filtersJson: "{}",
      }
    );
    await authed.mutation(api.autopilot.mutations.views.updateView, {
      viewId,
      name: "Renamed",
      filtersJson: JSON.stringify({ status: ["todo"] }),
    });
    const view = await t.run((ctx) => ctx.db.get(viewId));
    expect(view?.name).toBe("Renamed");

    await authed.mutation(api.autopilot.mutations.views.deleteView, { viewId });
    const after = await t.run((ctx) => ctx.db.get(viewId));
    expect(after).toBeNull();
  });

  test("listViews enforces org membership", async () => {
    const t = createTestContext();
    const orgA = await createOrg(t);
    const orgB = await createOrg(t);
    const authedA = await createMemberSession(t, orgA);

    await expect(
      authedA.query(api.autopilot.queries.views.listViews, {
        organizationId: orgB,
      })
    ).rejects.toThrow();
  });
});
