import { z } from "zod";

export const BUDGET_ROLE_OPTIONS = [
  { id: "pm", label: "PM" },
  { id: "cto", label: "CTO" },
  { id: "growth", label: "Growth" },
  { id: "support", label: "Support" },
  { id: "sales", label: "Sales" },
] as const;

const storedBudgetCapsSchema = z.record(z.string(), z.unknown());

function isBudgetRoleId(key: string): boolean {
  return BUDGET_ROLE_OPTIONS.some((role) => role.id === key);
}

export function parseBudgetCapsJson(
  storedValue: string | undefined
): Record<string, number> {
  if (!storedValue) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(storedValue);
    const result = storedBudgetCapsSchema.safeParse(parsed);
    if (!result.success) {
      return {};
    }

    const caps: Record<string, number> = {};
    const entries = Object.entries(result.data).sort(([leftKey], [rightKey]) =>
      leftKey.localeCompare(rightKey)
    );

    for (const [key, value] of entries) {
      if (
        isBudgetRoleId(key) &&
        typeof value === "number" &&
        Number.isFinite(value) &&
        value > 0
      ) {
        caps[key] = value;
      }
    }

    return caps;
  } catch {
    return {};
  }
}

export function createBudgetInputValues(
  storedValue: string | undefined
): Record<string, string> {
  const parsed = parseBudgetCapsJson(storedValue);
  const values: Record<string, string> = {};

  for (const role of BUDGET_ROLE_OPTIONS) {
    values[role.id] =
      parsed[role.id] === undefined ? "" : String(parsed[role.id]);
  }

  return values;
}

export function formatBudgetCapsJson(values: Record<string, string>): string {
  const result: Record<string, number> = {};
  const sortedRoleOptions = [...BUDGET_ROLE_OPTIONS].sort((left, right) =>
    left.id.localeCompare(right.id)
  );

  for (const role of sortedRoleOptions) {
    const numericValue = Number.parseFloat(values[role.id] ?? "");
    if (Number.isFinite(numericValue) && numericValue > 0) {
      result[role.id] = numericValue;
    }
  }

  return JSON.stringify(result);
}
