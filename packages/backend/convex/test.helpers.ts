/// <reference types="vite/client" />

import { defineSchema, queryGeneric } from "convex/server";
import { v } from "convex/values";
import { convexTest } from "convex-test";
import schema from "./schema";

// glob stays at convex/ root — Vite drops nested test ancestors from ../../ globs
export const modules = import.meta.glob("./**/*.*s");

export interface AuthTestUser {
  _id: string;
  email: string;
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
      getSubscriptionByOrgId: queryGeneric({
        args: { orgId: v.string() },
        handler: () =>
          subscriptionStatus === null ? null : { status: subscriptionStatus },
      }),
    }),
});

const findUser = (users: AuthTestUser[], where: { value: unknown }[]) => {
  const id = where[0]?.value;
  return users.find((user) => user._id === id) ?? null;
};

const createAuthModules = (users: AuthTestUser[]) => ({
  "./_generated/api.ts": () => Promise.resolve({}),
  "./adapter.ts": () =>
    Promise.resolve({
      findOne: queryGeneric({
        args: { model: v.string(), where: v.any() },
        handler: (_ctx, args) => findUser(users, args.where),
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
  return test;
};
