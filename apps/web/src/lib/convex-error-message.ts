import { ConvexError } from "convex/values";

/** Survey mutations explain business-rule failures in `ConvexError` data; show that text as-is. */
export const convexErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof ConvexError && typeof error.data === "string"
    ? error.data
    : fallback;
