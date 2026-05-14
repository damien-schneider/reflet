/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { deriveOrgPrefix } from "../lib/identifier";
import {
  createMemberSession,
  createOrg,
  createTestContext,
  type TestContext,
} from "./test-fixtures.helpers";

const IDENTIFIER_TAIL_REGEX = /-(\d+)$/;

const seedOrg = async (t: TestContext, name: string, slug: string) => {
  const orgId = await t.run(async (ctx) =>
    ctx.db.insert("organizations", {
      name,
      slug,
      isPublic: false,
      subscriptionTier: "pro",
      subscriptionStatus: "active",
      createdAt: Date.now(),
    })
  );
  return orgId;
};

const create = async (
  authed: Awaited<ReturnType<typeof createMemberSession>>,
  organizationId: Id<"organizations">,
  title: string
) =>
  authed.mutation(api.autopilot.mutations.work.createWorkItem, {
    organizationId,
    type: "task",
    title,
    description: "test",
    priority: "medium",
  });

describe("deriveOrgPrefix", () => {
  test("uses first 3-6 alpha chars of slug", () => {
    expect(deriveOrgPrefix({ slug: "acme-rockets", name: "Acme" })).toBe(
      "ACMERO"
    );
  });

  test("falls back to name when slug has too few alpha chars", () => {
    expect(deriveOrgPrefix({ slug: "12", name: "Beta Corp" })).toBe("BETACO");
  });

  test("returns ORG fallback when both empty of alpha", () => {
    expect(deriveOrgPrefix({ slug: "12-3", name: "9 9" })).toBe("ORG");
  });

  test("respects min 3 chars", () => {
    expect(deriveOrgPrefix({ slug: "ab", name: "Pro" })).toBe("PRO");
  });
});

describe("identifier auto-allocation", () => {
  test("increments counter atomically per org and is unique", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const authed = await createMemberSession(t, organizationId);

    const idA = await create(authed, organizationId, "first");
    const idB = await create(authed, organizationId, "second");
    const idC = await create(authed, organizationId, "third");

    const items = await Promise.all([
      t.run((ctx) => ctx.db.get(idA)),
      t.run((ctx) => ctx.db.get(idB)),
      t.run((ctx) => ctx.db.get(idC)),
    ]);

    const identifiers = items.map((i) => i?.identifier ?? "");
    expect(identifiers.every((s) => s.length > 0)).toBe(true);
    expect(new Set(identifiers).size).toBe(3);
    // Numeric tail must be 1, 2, 3 in order.
    const tails = identifiers.map((s) => {
      const match = IDENTIFIER_TAIL_REGEX.exec(s);
      return Number(match?.[1] ?? "0");
    });
    expect(tails).toEqual([1, 2, 3]);
  });

  test("counter is org-scoped — two orgs both start at 1", async () => {
    const t = createTestContext();
    const orgA = await createOrg(t);
    const orgB = await createOrg(t);
    const authedA = await createMemberSession(t, orgA);
    const authedB = await createMemberSession(t, orgB);

    const a1 = await create(authedA, orgA, "a-first");
    const b1 = await create(authedB, orgB, "b-first");

    const [docA, docB] = await Promise.all([
      t.run((ctx) => ctx.db.get(a1)),
      t.run((ctx) => ctx.db.get(b1)),
    ]);

    expect(docA?.identifier?.endsWith("-1")).toBe(true);
    expect(docB?.identifier?.endsWith("-1")).toBe(true);

    // Counter is independent per-org. Verify by inspecting both rows.
    const counters = await t.run((ctx) =>
      ctx.db.query("organizationCounters").collect()
    );
    const orgACounter = counters.find((c) => c.organizationId === orgA);
    const orgBCounter = counters.find((c) => c.organizationId === orgB);
    expect(orgACounter?.value).toBe(1);
    expect(orgBCounter?.value).toBe(1);
  });

  test("derives prefix from a custom organization slug", async () => {
    const t = createTestContext();
    const organizationId = await seedOrg(t, "Test", `acme-${Date.now()}`);

    const org = await t.run((ctx) => ctx.db.get(organizationId));
    if (!org) {
      throw new Error("org missing");
    }
    expect(deriveOrgPrefix(org).startsWith("ACME")).toBe(true);
  });
});

describe("bulkUpdateWorkItems", () => {
  test("rejects when any id is from another org", async () => {
    const t = createTestContext();
    const orgA = await createOrg(t);
    const orgB = await createOrg(t);
    const authedA = await createMemberSession(t, orgA);
    const authedB = await createMemberSession(t, orgB);

    const a1 = await create(authedA, orgA, "a1");
    const a2 = await create(authedA, orgA, "a2");
    const b1 = await create(authedB, orgB, "b1");

    await expect(
      authedA.mutation(api.autopilot.mutations.work.bulkUpdateWorkItems, {
        organizationId: orgA,
        workItemIds: [a1, a2, b1],
        priority: "high",
      })
    ).rejects.toThrow();

    // Verify nothing was patched.
    const docs = await Promise.all([
      t.run((ctx) => ctx.db.get(a1)),
      t.run((ctx) => ctx.db.get(a2)),
    ]);
    for (const d of docs) {
      expect(d?.priority).toBe("medium");
    }
  });

  test("updates all matching items in one call", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const authed = await createMemberSession(t, organizationId);

    const a = await create(authed, organizationId, "a");
    const b = await create(authed, organizationId, "b");
    const c = await create(authed, organizationId, "c");

    const result = await authed.mutation(
      api.autopilot.mutations.work.bulkUpdateWorkItems,
      {
        organizationId,
        workItemIds: [a, b, c],
        status: "in_progress",
        priority: "high",
      }
    );
    expect(result.updated).toBe(3);

    const docs = await Promise.all([
      t.run((ctx) => ctx.db.get(a)),
      t.run((ctx) => ctx.db.get(b)),
      t.run((ctx) => ctx.db.get(c)),
    ]);
    for (const d of docs) {
      expect(d?.status).toBe("in_progress");
      expect(d?.priority).toBe("high");
    }
  });
});

describe("migrateNeedsReviewToTriage", () => {
  test("flips review items to triage and is idempotent", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const authed = await createMemberSession(t, organizationId);

    // Seed two review items + one terminal.
    const reviewId = await t.run((ctx) =>
      ctx.db.insert("autopilotWorkItems", {
        organizationId,
        type: "task",
        title: "Needs review",
        description: "",
        status: "todo",
        priority: "medium",
        needsReview: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );
    const terminalId = await t.run((ctx) =>
      ctx.db.insert("autopilotWorkItems", {
        organizationId,
        type: "task",
        title: "Already done",
        description: "",
        status: "done",
        priority: "low",
        needsReview: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const first = await authed.mutation(
      api.autopilot.mutations.work.migrateNeedsReviewToTriage,
      { organizationId }
    );
    expect(first.migrated).toBe(2);

    const reviewDoc = await t.run((ctx) => ctx.db.get(reviewId));
    expect(reviewDoc?.status).toBe("triage");
    expect(reviewDoc?.needsReview).toBe(false);

    const terminalDoc = await t.run((ctx) => ctx.db.get(terminalId));
    expect(terminalDoc?.status).toBe("done");
    expect(terminalDoc?.needsReview).toBe(false);

    // Idempotent — no further changes.
    const second = await authed.mutation(
      api.autopilot.mutations.work.migrateNeedsReviewToTriage,
      { organizationId }
    );
    expect(second.migrated).toBe(0);
  });
});

describe("assignWorkItem", () => {
  test("sets agent and user assignee independently", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    const authed = await createMemberSession(t, organizationId);
    const id = await create(authed, organizationId, "assign me");

    await authed.mutation(api.autopilot.mutations.work.assignWorkItem, {
      workItemId: id,
      assignedAgent: "cto",
      assigneeUserId: "user_123",
    });

    const doc = await t.run((ctx) => ctx.db.get(id));
    expect(doc?.assignedAgent).toBe("cto");
    expect(doc?.assigneeUserId).toBe("user_123");

    await authed.mutation(api.autopilot.mutations.work.assignWorkItem, {
      workItemId: id,
      clearAssignedAgent: true,
    });
    const cleared = await t.run((ctx) => ctx.db.get(id));
    expect(cleared?.assignedAgent).toBeUndefined();
    expect(cleared?.assigneeUserId).toBe("user_123");
  });
});
