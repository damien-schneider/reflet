import { ConvexError } from "convex/values";

/** Mutations explain business-rule failures in `ConvexError` data; show that text as-is. */
export const convexErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof ConvexError && typeof error.data === "string"
    ? error.data
    : fallback;

export const isRateLimitedError = (error: unknown): boolean =>
  error instanceof ConvexError &&
  typeof error.data === "object" &&
  error.data !== null &&
  "kind" in error.data &&
  error.data.kind === "RateLimited";
