/// <reference types="vite/client" />

import type { TestConvex } from "convex-test";
import stripeSchema from "../node_modules/@convex-dev/stripe/src/component/schema";
import type schema from "./schema";

// Shared module glob for convex-test.
// Must live at the convex/ root so Vite includes all domain directories.
// Tests in __tests__/ subdirectories cannot use ../../**/*.ts because
// Vite excludes the test file's ancestor directory from glob results.
export const modules = import.meta.glob("./**/*.*s");
export const CONVEX_INTEGRATION_TEST_TIMEOUT_MS = 20_000;

const stripeModules = import.meta.glob(
  "../node_modules/@convex-dev/stripe/src/component/**/*.*s"
);

export const registerStripeComponent = (t: TestConvex<typeof schema>) => {
  t.registerComponent("stripe", stripeSchema, stripeModules);
};
