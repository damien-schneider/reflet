"use client";

import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BUDGET_AGENT_OPTIONS,
  createBudgetInputValues,
  formatBudgetCapsJson,
} from "@/features/autopilot/lib/budget-caps";

export function PerAgentBudgets({
  storedValue,
  disabled,
  onSave,
}: {
  storedValue: string | undefined;
  disabled: boolean;
  onSave: (json: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    createBudgetInputValues(storedValue)
  );

  const saveAgentBudgetCaps = () => {
    onSave(formatBudgetCapsJson(values));
  };

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        {BUDGET_AGENT_OPTIONS.map((agent) => (
          <div className="flex items-center gap-3" key={agent.id}>
            <Label
              className="w-20 font-medium text-sm"
              htmlFor={`budget-${agent.id}`}
            >
              {agent.label}
            </Label>
            <div className="relative flex-1">
              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground text-sm">
                $
              </span>
              <Input
                className="pl-7 font-mono text-sm"
                disabled={disabled}
                id={`budget-${agent.id}`}
                min={0}
                onBlur={saveAgentBudgetCaps}
                onChange={(event) =>
                  setValues((previous) => ({
                    ...previous,
                    [agent.id]: event.target.value,
                  }))
                }
                placeholder="No limit"
                step="0.01"
                type="number"
                value={values[agent.id]}
              />
            </div>
            <span className="text-muted-foreground text-xs">/day</span>
          </div>
        ))}
        <p className="text-muted-foreground text-xs">
          Leave blank for no per-agent limit. Total daily cap still applies.
        </p>
      </CardContent>
    </Card>
  );
}
