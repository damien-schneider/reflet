"use client";

import { IconCurrencyDollar } from "@tabler/icons-react";

import { PerAgentBudgets } from "@/features/autopilot/components/settings/per-agent-budgets";
import { SectionHeader } from "@/features/autopilot/components/settings/section-header";

export function BudgetSettings({
  disabled,
  onSave,
  storedValue,
}: {
  disabled: boolean;
  onSave: (json: string) => void;
  storedValue: string | undefined;
}) {
  return (
    <section className="space-y-5">
      <SectionHeader
        description="Set individual daily cost caps per agent"
        icon={IconCurrencyDollar}
        title="Per-Agent Budgets"
      />

      <PerAgentBudgets
        disabled={disabled}
        key={storedValue ?? "empty"}
        onSave={onSave}
        storedValue={storedValue}
      />
    </section>
  );
}
