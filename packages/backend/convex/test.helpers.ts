/// <reference types="vite/client" />

import { defineSchema, queryGeneric } from "convex/server";
import { v } from "convex/values";
import { convexTest } from "convex-test";
import schema from "./schema";

// glob stays at convex/ root — Vite drops nested test ancestors from ../../ globs
export const modules = import.meta.glob("./**/*.*s");

interface TestOptions {
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

export const setupTest = ({
  stripeSubscriptionStatus = null,
}: TestOptions = {}) => {
  const test = convexTest(schema, modules);
  test.registerComponent(
    "stripe",
    defineSchema({}),
    createStripeModules(stripeSubscriptionStatus)
  );
  return test;
};
