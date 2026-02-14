import type { Id } from "@reflet/backend/convex/_generated/dataModel";

/**
 * Validates that a string looks like a Convex ID and casts it.
 * Convex IDs are non-empty strings — this provides a centralized
 * runtime check instead of scattered `as Id<...>` assertions.
 */
export const toOrgId = (value: string): Id<"organizations"> => {
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      "Invalid organization ID: value must be a non-empty string"
    );
  }
  // Convex IDs are opaque strings; we validate non-emptiness at the boundary.
  return value as Id<"organizations">;
};
