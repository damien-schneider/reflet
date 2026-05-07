import { z } from "zod";

export const BUDGET_AGENT_OPTIONS = [
  { id: "pm", label: "PM" },
  { id: "cto", label: "CTO" },
  { id: "dev", label: "Dev" },
  { id: "growth", label: "Growth" },
  { id: "support", label: "Support" },
  { id: "sales", label: "Sales" },
] as const;

const storedBudgetCapsSchema = z.record(z.string(), z.unknown());

function isBudgetAgentId(key: string): boolean {
  return BUDGET_AGENT_OPTIONS.some((agent) => agent.id === key);
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
        isBudgetAgentId(key) &&
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

  for (const agent of BUDGET_AGENT_OPTIONS) {
    values[agent.id] =
      parsed[agent.id] === undefined ? "" : String(parsed[agent.id]);
  }

  return values;
}

export function formatBudgetCapsJson(values: Record<string, string>): string {
  const result: Record<string, number> = {};
  const sortedAgentOptions = [...BUDGET_AGENT_OPTIONS].sort((left, right) =>
    left.id.localeCompare(right.id)
  );

  for (const agent of sortedAgentOptions) {
    const numericValue = Number.parseFloat(values[agent.id] ?? "");
    if (Number.isFinite(numericValue) && numericValue > 0) {
      result[agent.id] = numericValue;
    }
  }

  return JSON.stringify(result);
}
