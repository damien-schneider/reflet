/// <reference types="vite/client" />

import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { defineSchema, queryGeneric } from "convex/server";
import { v } from "convex/values";
import { convexTest } from "convex-test";
import schema from "./schema";

export const modules = import.meta.glob("./**/*.*s");

export interface AuthTestUser {
  _id: string;
  email: string;
  emailVerified?: boolean;
  image?: string;
  name?: string;
  sessionsUpdatedAt?: number[];
}

interface TestOptions {
  authUsers?: AuthTestUser[];
  stripeSubscriptionStatus?: string | null;
}

const createStripeModules = (subscriptionStatus: string | null) => ({
  "./_generated/api.ts": () => Promise.resolve({}),
  "./public.ts": () =>
    Promise.resolve({
      listInvoicesByOrgId: queryGeneric({
        args: { orgId: v.string() },
        handler: () => [],
      }),
      listSubscriptionsByOrgId: queryGeneric({
        args: { orgId: v.string() },
        handler: () =>
          subscriptionStatus === null
            ? []
            : [
                {
                  cancelAtPeriodEnd: false,
                  currentPeriodEnd: 0,
                  priceId: "price_test",
                  status: subscriptionStatus,
                  stripeCustomerId: "cus_test",
                  stripeSubscriptionId: "sub_test",
                },
              ],
      }),
    }),
});

const findAuthRecord = (
  users: AuthTestUser[],
  args: { model: string; where: { value: unknown }[] }
) => {
  const user = users.find(({ _id }) => _id === args.where[0]?.value);
  if (!user) {
    return null;
  }
  if (args.model === "session") {
    return {
      _id: user._id,
      expiresAt: Number.MAX_SAFE_INTEGER,
      userId: user._id,
    };
  }
  return user;
};

const createAuthModules = (users: AuthTestUser[]) => ({
  "./_generated/api.ts": () => Promise.resolve({}),
  "./adapter.ts": () =>
    Promise.resolve({
      findMany: queryGeneric({
        args: {
          model: v.literal("session"),
          paginationOpts: v.any(),
          sortBy: v.any(),
          where: v.array(
            v.object({
              field: v.string(),
              operator: v.string(),
              value: v.string(),
            })
          ),
        },
        handler: (_ctx, args) => {
          const user = users.find(({ _id }) => _id === args.where[0]?.value);
          return {
            continueCursor: "",
            isDone: true,
            page: (user?.sessionsUpdatedAt ?? []).map((updatedAt) => ({
              updatedAt,
            })),
          };
        },
      }),
      findOne: queryGeneric({
        args: { model: v.string(), where: v.any() },
        handler: (_ctx, args) => findAuthRecord(users, args),
      }),
    }),
});

export const setupTest = ({
  authUsers = [],
  stripeSubscriptionStatus = null,
}: TestOptions = {}) => {
  const test = convexTest(schema, modules);
  test.registerComponent(
    "stripe",
    defineSchema({}),
    createStripeModules(stripeSubscriptionStatus)
  );
  test.registerComponent(
    "betterAuth",
    defineSchema({}),
    createAuthModules(authUsers)
  );
  rateLimiterTest.register(test);
  return test;
};

export type TestContext = ReturnType<typeof setupTest>;
