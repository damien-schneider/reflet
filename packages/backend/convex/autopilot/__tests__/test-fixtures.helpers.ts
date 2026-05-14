/// <reference types="vite/client" />

import betterAuthTest from "@convex-dev/better-auth/test";
import { convexTest } from "convex-test";
import { expect } from "vitest";
import { components, internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { modules, registerStripeComponent } from "../../test.helpers";

const readDocId = (doc: { _id: string }) => doc._id;

export const createTestContext = () => {
  const t = convexTest(schema, modules);
  registerStripeComponent(t);
  return t;
};
export type TestContext = ReturnType<typeof createTestContext>;

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

let createOrgCounter = 0;

export const createOrg = async (t: TestContext) => {
  createOrgCounter += 1;
  const slug = `production-readiness-${Date.now()}-${createOrgCounter}`;
  const organizationId = await t.run(async (ctx) =>
    ctx.db.insert("organizations", {
      name: "Production Readiness Org",
      slug,
      isPublic: false,
      subscriptionTier: "pro",
      subscriptionStatus: "active",
      createdAt: Date.now(),
    })
  );
  await createActiveStripeSubscription(t, organizationId);
  return organizationId;
};

let memberSessionCounter = 0;
const betterAuthRegistered = new WeakSet<TestContext>();

export const createMemberSession = async (
  t: TestContext,
  organizationId: Id<"organizations">,
  role: "admin" | "member" | "owner" = "admin"
) => {
  if (!betterAuthRegistered.has(t)) {
    t.registerComponent(
      "betterAuth",
      betterAuthTest.schema,
      betterAuthTest.modules
    );
    betterAuthRegistered.add(t);
  }
  const now = Date.now();
  memberSessionCounter += 1;
  const uniqueSuffix = `${now}-${memberSessionCounter}`;
  const user = await t.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "user",
      data: {
        name: "Autopilot Reviewer",
        email: `autopilot-reviewer-${uniqueSuffix}@example.com`,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    },
  });
  const userId = readDocId(user);
  const session = await t.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "session",
      data: {
        userId,
        token: `session-${uniqueSuffix}`,
        expiresAt: now + 24 * 60 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      },
    },
  });
  const sessionId = readDocId(session);

  await t.run(async (ctx) => {
    await ctx.db.insert("organizationMembers", {
      organizationId,
      userId,
      role,
      createdAt: now,
    });
  });

  return t.withIdentity({ subject: userId, sessionId });
};

export const createAutopilotConfig = async (
  t: TestContext,
  organizationId: Id<"organizations">,
  overrides: {
    autonomyMode?: Doc<"autopilotConfig">["autonomyMode"];
    ceoChatThreadId?: string;
    costUsedTodayUsd?: number;
    dailyCostCapUsd?: number;
    enabled?: boolean;
    growthEnabled?: boolean;
    maxTasksPerDay?: number;
    tasksResetAt?: number;
    tasksUsedToday?: number;
  } = {}
) =>
  t.run((ctx) => {
    const now = Date.now();
    return ctx.db.insert("autopilotConfig", {
      organizationId,
      enabled: true,
      autonomyLevel: "review_required",
      autonomyMode: "supervised",
      maxTasksPerDay: 10,
      tasksUsedToday: 0,
      tasksResetAt: now + 24 * 60 * 60 * 1000,
      requireArchitectReview: true,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    });
  });

export const createValidatorScore = (
  recommendation: "publish" | "reject" | "revise"
) => ({
  audienceBreadth: 70,
  composite: recommendation === "publish" ? 75 : 45,
  cost: 80,
  devComplexity: 80,
  maintainability: 80,
  rationale: "Relevant production readiness artifact",
  recommendation,
  scoredAt: Date.now(),
  utility: recommendation === "publish" ? 80 : 40,
});

export function expectWorkItemId(
  taskId: Id<"autopilotWorkItems"> | null
): Id<"autopilotWorkItems"> {
  expect(taskId).toBeTypeOf("string");
  if (taskId === null) {
    throw new Error("Expected createTask to return a work item id");
  }
  return taskId;
}

export const createParentTask = async (
  t: TestContext,
  options: {
    description: string;
    organizationId: Id<"organizations">;
    priority: Doc<"autopilotWorkItems">["priority"];
    title: string;
  }
) =>
  expectWorkItemId(
    await t.mutation(internal.autopilot.task_mutations.createTask, {
      organizationId: options.organizationId,
      title: options.title,
      description: options.description,
      priority: options.priority,
      assignedAgent: "cto",
      createdBy: "test",
    })
  );

export const getActivity = (t: TestContext) =>
  t.run(async (ctx) => ctx.db.query("autopilotActivityLog").collect());

export const hasMessage = (
  activity: Doc<"autopilotActivityLog">[],
  message: string
) => activity.some((entry) => entry.message === message);
