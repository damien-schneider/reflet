import type { Id } from "@reflet/backend/convex/_generated/dataModel";

type ConvexTableName =
  | "organizations"
  | "organizationStatuses"
  | "autopilotLeads"
  | "autopilotWorkItems"
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

const CONVEX_ID_PATTERN = /^[a-z0-9]{32}$/;

export const toOptionalId = <T extends ConvexTableName>(
  table: T,
  value: unknown
): Id<T> | null => {
  if (typeof value !== "string" || !CONVEX_ID_PATTERN.test(value)) {
    return null;
  }
  return toId(table, value);
};

export const toOrgId = (value: string): Id<"organizations"> =>
  toId("organizations", value);
