/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { components, internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { modules, registerStripeComponent } from "../../test.helpers";

const createTestContext = () => {
  const t = convexTest(schema, modules);
  registerStripeComponent(t);
  return t;
};
type TestContext = ReturnType<typeof createTestContext>;

const createActiveStripeSubscription = async (
  t: TestContext,
  organizationId: Id<"organizations">
) => {
  const stripeSubscriptionId = `sub_autopilot_${organizationId}`;
  const stripeCustomerId = `cus_autopilot_${organizationId}`;
  await t.mutation(components.stripe.private.handleSubscriptionCreated, {
    stripeSubscriptionId,
    stripeCustomerId,
    status: "active",
    currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
    cancelAtPeriodEnd: false,
    priceId: "price_pro",
    metadata: { orgId: organizationId },
  });
  await t.run(async (ctx) => {
    await ctx.db.patch(organizationId, {
      stripeCustomerId,
      stripeSubscriptionId,
    });
  });
};

const createOrg = async (t: TestContext) => {
  const organizationId = await t.run(async (ctx) =>
    ctx.db.insert("organizations", {
      name: "Test Org",
      slug: `test-org-${Date.now()}-${Math.random()}`,
      isPublic: false,
      subscriptionTier: "pro",
      subscriptionStatus: "active",
      createdAt: Date.now(),
    })
  );
  await createActiveStripeSubscription(t, organizationId);
  return organizationId;
};

interface ConfigOverrides {
  autonomyMode?: "supervised" | "full_auto" | "stopped";
  ctoEnabled?: boolean;
  enabled?: boolean;
  growthEnabled?: boolean;
  pmEnabled?: boolean;
  salesEnabled?: boolean;
  supportEnabled?: boolean;
}

const createConfig = async (
  t: TestContext,
  organizationId: Id<"organizations">,
  overrides: ConfigOverrides = {}
) =>
  t.run(async (ctx) => {
    const now = Date.now();
    return ctx.db.insert("autopilotConfig", {
      organizationId,
      enabled: true,
      autonomyLevel: "review_required",
      autonomyMode: "supervised",
      maxTasksPerDay: 100,
      tasksUsedToday: 0,
      tasksResetAt: now + 24 * 60 * 60 * 1000,
      requireArchitectReview: true,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    });
  });

const runSchedule = (t: TestContext, organizationId: Id<"organizations">) =>
  t.query(internal.autopilot.role_schedule.getRoleScheduleInternal, {
    organizationId,
  });

const seedCompletedRepoAnalysis = async (
  t: TestContext,
  organizationId: Id<"organizations">
) => {
  await t.run(async (ctx) => {
    const now = Date.now();
    const githubConnectionId = await ctx.db.insert("githubConnections", {
      organizationId,
      installationId: "test-installation",
      accountType: "organization",
      accountLogin: "test-org",
      status: "connected",
      repositoryFullName: "test-org/test-repo",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("repoAnalysis", {
      organizationId,
      githubConnectionId,
      status: "completed",
      productAnalysis: "# Test Product\n\nSeeded analysis text.",
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    });
  });
};

const findEntry = (
  schedule: Awaited<ReturnType<typeof runSchedule>>,
  role: string
) => {
  const entry = schedule.find((e) => e.role === role);
  if (!entry) {
    throw new Error(`role ${role} missing from schedule`);
  }
  return entry;
};

describe("computeRoleSchedule - disabled role skills", () => {
  test("growth/sales/support default to disabled when not opted in", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createConfig(t, organizationId);
    const schedule = await runSchedule(t, organizationId);

    for (const role of ["growth", "sales", "support"]) {
      const entry = findEntry(schedule, role);
      expect(entry.state).toBe("blocked");
      expect(entry.blockers.some((b) => b.kind === "role_disabled")).toBe(true);
    }
  });

  test("cto/pm/validator/ceo are enabled by default", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createConfig(t, organizationId);
    const schedule = await runSchedule(t, organizationId);

    for (const role of ["cto", "pm", "validator", "ceo"]) {
      const entry = findEntry(schedule, role);
      expect(entry.blockers.some((b) => b.kind === "role_disabled")).toBe(
        false
      );
    }
  });
});

describe("computeRoleSchedule — chain producer blockers", () => {
  test("cto blocked by precondition_unmet when repo analysis missing", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createConfig(t, organizationId);
    const schedule = await runSchedule(t, organizationId);
    const cto = findEntry(schedule, "cto");
    expect(cto.state).toBe("blocked");
    expect(
      cto.blockers.some(
        (b) =>
          b.kind === "precondition_unmet" && b.node === "codebase_understanding"
      )
    ).toBe(true);
  });

  test("cto becomes ready when repo analysis is completed", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createConfig(t, organizationId);
    await seedCompletedRepoAnalysis(t, organizationId);
    const schedule = await runSchedule(t, organizationId);
    const cto = findEntry(schedule, "cto");
    expect(cto.state).toBe("ready");
    expect(cto.nextAction?.kind).toBe("chain_producer");
  });
});

describe("computeRoleSchedule — validator", () => {
  test("idle when no pending review", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createConfig(t, organizationId);
    const schedule = await runSchedule(t, organizationId);
    const validator = findEntry(schedule, "validator");
    expect(validator.state).toBe("idle");
  });

  test("ready when documents pending review without validation score", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createConfig(t, organizationId);
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("autopilotDocuments", {
        organizationId,
        type: "market_research",
        title: "Pending market research",
        content: "Body",
        tags: [],
        sourceRole: "growth",
        status: "pending_review",
        needsReview: true,
        createdAt: now,
        updatedAt: now,
      });
    });
    const schedule = await runSchedule(t, organizationId);
    const validator = findEntry(schedule, "validator");
    expect(validator.state).toBe("ready");
    expect(validator.nextAction?.kind).toBe("validation_pass");
  });
});

describe("computeRoleSchedule — no artificial blockers", () => {
  test("open task count does not gate the chain", async () => {
    const t = createTestContext();
    const organizationId = await createOrg(t);
    await createConfig(t, organizationId);
    await seedCompletedRepoAnalysis(t, organizationId);
    await t.run(async (ctx) => {
      const now = Date.now();
      for (let i = 0; i < 12; i++) {
        await ctx.db.insert("autopilotWorkItems", {
          organizationId,
          type: "task",
          title: `task ${i}`,
          description: "load",
          status: "todo",
          priority: "medium",
          assignedRole: "cto",
          needsReview: false,
          createdAt: now,
          updatedAt: now,
        });
      }
    });
    const schedule = await runSchedule(t, organizationId);
    const cto = findEntry(schedule, "cto");
    // Chain producer still wins (codebase_understanding missing), and even if
    // producers are exhausted, open-task volume is not a wake reason.
    expect(cto.state).toBe("ready");
  });
});
