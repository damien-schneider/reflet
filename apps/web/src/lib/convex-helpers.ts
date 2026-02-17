import type { Id } from "@reflet/backend/convex/_generated/dataModel";

type ConvexTableName =
  | "organizations"
  | "organizationStatuses"
  | "feedback"
  | "tags"
  | "widgets"
  | "githubLabelMappings";

/**
 * Validates that a value is a non-empty string suitable for use as a Convex ID.
 * Use at boundaries (event handlers, URL params) instead of bare `as Id<...>`.
 */
const validateIdString = (value: unknown, table: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid ${table} ID: value must be a non-empty string`);
  }
  return value;
};

export const toId = <T extends ConvexTableName>(
  table: T,
  value: unknown
): Id<T> => validateIdString(value, table) as unknown as Id<T>;

export const toOrgId = (value: string): Id<"organizations"> =>
  toId("organizations", value);
