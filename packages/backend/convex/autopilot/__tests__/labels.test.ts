/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import {
  createMemberSession,
  createOrg,
  createTestContext,
  type TestContext,
} from "./test-fixtures.helpers";

const createWorkItem = async (
  authed: Awaited<ReturnType<typeof createMemberSession>>,
  organizationId: Id<"organizations">
) =>
  authed.mutation(api.autopilot.mutations.work.createWorkItem, {
    organizationId,
    type: "task",
    title: "Labelable",
    description: "",
    priority: "medium",
  });

const seedLabel = async (
  t: TestContext,
  authed: Awaited<ReturnType<typeof createMemberSession>>,
  organizationId: Id<"organizations">,
  name = "Bug"
) =>
  authed.mutation(api.autopilot.mutations.labels.createLabel, {
    organizationId,
    name,
    color: "#ff0000",
  });

describe("workItemLabels", () => {
  test("create + list returns label", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const authed = await createMemberSession(t, organizationId);

    const labelId = await seedLabel(t, authed, organizationId, "Bug");
    const labels = await authed.query(api.autopilot.queries.labels.listLabels, {
      organizationId,
    });
    expect(labels.map((l) => l._id)).toContain(labelId);
  });

  test("listLabels enforces org isolation", async () => {
    const t = createTestContext();
    const orgA = await createOrg(t);
    const orgB = await createOrg(t);
    const authedA = await createMemberSession(t, orgA);
    const authedB = await createMemberSession(t, orgB);

    await seedLabel(t, authedA, orgA, "AOnly");
    await seedLabel(t, authedB, orgB, "BOnly");

    const aLabels = await authedA.query(
      api.autopilot.queries.labels.listLabels,
      { organizationId: orgA }
    );
    expect(aLabels.map((l) => l.name)).toEqual(["AOnly"]);

    // Member of A cannot list B's labels.
    await expect(
      authedA.query(api.autopilot.queries.labels.listLabels, {
        organizationId: orgB,
      })
    ).rejects.toThrow();
  });

  test("addLabel + removeLabel roundtrip", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const authed = await createMemberSession(t, organizationId);

    const labelId = await seedLabel(t, authed, organizationId);
    const workItemId = await createWorkItem(authed, organizationId);

    await authed.mutation(api.autopilot.mutations.labels.addLabel, {
      workItemId,
      labelId,
    });

    let labels = await authed.query(
      api.autopilot.queries.labels.listWorkItemLabels,
      { workItemId }
    );
    expect(labels.map((l) => l?._id)).toContain(labelId);

    // addLabel is idempotent — second call doesn't duplicate.
    await authed.mutation(api.autopilot.mutations.labels.addLabel, {
      workItemId,
      labelId,
    });
    const links = await t.run((ctx) =>
      ctx.db
        .query("workItemLabelLinks")
        .withIndex("by_work_item", (q) => q.eq("workItemId", workItemId))
        .collect()
    );
    expect(links.length).toBe(1);

    await authed.mutation(api.autopilot.mutations.labels.removeLabel, {
      workItemId,
      labelId,
    });
    labels = await authed.query(
      api.autopilot.queries.labels.listWorkItemLabels,
      { workItemId }
    );
    expect(labels.length).toBe(0);
  });

  test("addLabel rejects label from another org", async () => {
    const t = createTestContext();
    const orgA = await createOrg(t);
    const orgB = await createOrg(t);
    const authedA = await createMemberSession(t, orgA);
    const authedB = await createMemberSession(t, orgB);

    const labelB = await seedLabel(t, authedB, orgB, "B");
    const workItemA = await createWorkItem(authedA, orgA);

    await expect(
      authedA.mutation(api.autopilot.mutations.labels.addLabel, {
        workItemId: workItemA,
        labelId: labelB,
      })
    ).rejects.toThrow();
  });

  test("setLabels replaces full set", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const authed = await createMemberSession(t, organizationId);

    const a = await seedLabel(t, authed, organizationId, "A");
    const b = await seedLabel(t, authed, organizationId, "B");
    const c = await seedLabel(t, authed, organizationId, "C");

    const workItemId = await createWorkItem(authed, organizationId);
    await authed.mutation(api.autopilot.mutations.labels.setLabels, {
      workItemId,
      labelIds: [a, b],
    });
    const first = await authed.query(
      api.autopilot.queries.labels.listWorkItemLabels,
      { workItemId }
    );
    expect(new Set(first.map((l) => l?._id))).toEqual(new Set([a, b]));

    await authed.mutation(api.autopilot.mutations.labels.setLabels, {
      workItemId,
      labelIds: [b, c],
    });
    const second = await authed.query(
      api.autopilot.queries.labels.listWorkItemLabels,
      { workItemId }
    );
    expect(new Set(second.map((l) => l?._id))).toEqual(new Set([b, c]));
  });

  test("deleteLabel removes label and all links", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const authed = await createMemberSession(t, organizationId);

    const labelId = await seedLabel(t, authed, organizationId);
    const workItemId = await createWorkItem(authed, organizationId);
    await authed.mutation(api.autopilot.mutations.labels.addLabel, {
      workItemId,
      labelId,
    });

    await authed.mutation(api.autopilot.mutations.labels.deleteLabel, {
      labelId,
    });

    const label = await t.run((ctx) => ctx.db.get(labelId));
    expect(label).toBeNull();

    const links = await t.run((ctx) =>
      ctx.db
        .query("workItemLabelLinks")
        .withIndex("by_work_item", (q) => q.eq("workItemId", workItemId))
        .collect()
    );
    expect(links.length).toBe(0);
  });
});
