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
}

interface TestOptions {
  authUsers?: AuthTestUser[];
  stripeSubscriptionStatus?: string | null;
}

const createStripeModules = (subscriptionStatus: string | null) => ({
  "./_generated/api.ts": () => Promise.resolve({}),
  "./public.ts": () =>
    Promise.resolve({
      listSubscriptionsByOrgId: queryGeneric({
        args: { orgId: v.string() },
        handler: () =>
          subscriptionStatus === null
            ? []
            : [{ currentPeriodEnd: 0, status: subscriptionStatus }],
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
