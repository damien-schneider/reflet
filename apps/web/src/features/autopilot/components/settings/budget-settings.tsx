"use client";

import { IconCurrencyDollar } from "@tabler/icons-react";

import { RoleSkillBudgets } from "@/features/autopilot/components/settings/role-skill-budgets";
import { SectionHeader } from "@/features/autopilot/components/settings/section-header";

export function BudgetSettings({
  disabled,
  onSave,
  storedValue,
}: {
  disabled: boolean;
  onSave: (json: string) => Promise<void>;
  storedValue: string | undefined;
}) {
  return (
    <section className="space-y-5">
      <SectionHeader
        description="Set individual daily cost caps per role skill"
        icon={IconCurrencyDollar}
        title="Role-Skill Budgets"
      />

      <RoleSkillBudgets
        disabled={disabled}
        key={storedValue ?? "empty"}
        onSave={onSave}
        storedValue={storedValue}
      />
    </section>
  );
}
