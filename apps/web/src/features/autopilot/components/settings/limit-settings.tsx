"use client";

import {
  IconCurrencyDollar,
  IconMail,
  IconRobot,
  IconShieldCheck,
} from "@tabler/icons-react";
import { useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/features/autopilot/components/settings/section-header";

function parsePositiveInteger(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed > 0
    ? parsed
    : undefined;
}

function parseNonNegativeFloat(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function parseNonNegativeInteger(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed >= 0
    ? parsed
    : undefined;
}

interface LimitInputValues {
  costCap: string;
  emailLimit: string;
  maxTasks: string;
}

interface LimitInputDraft {
  inputKey: keyof LimitInputValues;
  sourceValues: LimitInputValues;
  value: string;
}

function getLimitInputValues({
  dailyCostCapUsd,
  emailDailyLimit,
  maxTasksPerDay,
}: {
  dailyCostCapUsd: number | undefined;
  emailDailyLimit: number | undefined;
  maxTasksPerDay: number;
}): LimitInputValues {
  return {
    costCap: dailyCostCapUsd === undefined ? "" : String(dailyCostCapUsd),
    emailLimit: String(emailDailyLimit ?? 20),
    maxTasks: String(maxTasksPerDay),
  };
}

function areLimitInputValuesEqual(
  left: LimitInputValues,
  right: LimitInputValues
): boolean {
  return (
    left.costCap === right.costCap &&
    left.emailLimit === right.emailLimit &&
    left.maxTasks === right.maxTasks
  );
}

function applyDraft(
  savedValues: LimitInputValues,
  draft: LimitInputDraft | null
): LimitInputValues {
  if (!(draft && areLimitInputValuesEqual(savedValues, draft.sourceValues))) {
    return savedValues;
  }

  if (draft.inputKey === "costCap") {
    return { ...savedValues, costCap: draft.value };
  }
  if (draft.inputKey === "emailLimit") {
    return { ...savedValues, emailLimit: draft.value };
  }
  return { ...savedValues, maxTasks: draft.value };
}

export function LimitSettings({
  dailyCostCapUsd,
  disabled,
  emailDailyLimit,
  maxTasksPerDay,
  onInvalidValue,
  onUpdate,
}: {
  dailyCostCapUsd: number | undefined;
  disabled: boolean;
  emailDailyLimit: number | undefined;
  maxTasksPerDay: number;
  onInvalidValue: (message: string) => void;
  onUpdate: (field: string, value: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState<LimitInputDraft | null>(null);
  const savedValues = getLimitInputValues({
    dailyCostCapUsd,
    emailDailyLimit,
    maxTasksPerDay,
  });
  const values = applyDraft(savedValues, draft);

  const updateDraft = (inputKey: keyof LimitInputValues, value: string) =>
    setDraft({
      inputKey,
      sourceValues: savedValues,
      value,
    });

  const clearDraft = () => setDraft(null);

  const commitLimitValue = async ({
    field,
    inputKey,
    invalidMessage,
    parse,
    value,
  }: {
    field: string;
    inputKey: keyof LimitInputValues;
    invalidMessage: string;
    parse: (rawValue: string) => number | undefined;
    value: string;
  }) => {
    const parsed = parse(value);
    if (parsed === undefined) {
      clearDraft();
      onInvalidValue(invalidMessage);
      return;
    }
    try {
      await onUpdate(field, parsed);
      updateDraft(inputKey, String(parsed));
    } catch {
      clearDraft();
      onInvalidValue("Failed to save limit");
    }
  };

  return (
    <section className="space-y-5">
      <SectionHeader
        description="Guard-rails to prevent runaway costs and activity"
        icon={IconShieldCheck}
        title="Limits & Safeguards"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <IconRobot className="size-4 text-muted-foreground" />
              Tasks / Day
            </CardTitle>
            <CardDescription className="text-xs">
              Max tasks agents can create daily
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              aria-label="Maximum tasks per day"
              className="font-mono"
              disabled={disabled}
              id="max-tasks"
              min={1}
              onBlur={async (event) => {
                await commitLimitValue({
                  field: "maxTasksPerDay",
                  inputKey: "maxTasks",
                  invalidMessage:
                    "Tasks per day must be a whole number of at least 1",
                  parse: parsePositiveInteger,
                  value: event.target.value,
                });
              }}
              onChange={(event) => updateDraft("maxTasks", event.target.value)}
              type="number"
              value={values.maxTasks}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <IconCurrencyDollar className="size-4 text-muted-foreground" />
              Cost Cap
            </CardTitle>
            <CardDescription className="text-xs">
              Daily spending limit in USD
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              aria-label="Daily cost cap in US dollars"
              className="font-mono"
              disabled={disabled}
              id="cost-cap"
              min={0}
              onBlur={async (event) => {
                await commitLimitValue({
                  field: "dailyCostCapUsd",
                  inputKey: "costCap",
                  invalidMessage: "Daily cost cap must be 0 or greater",
                  parse: parseNonNegativeFloat,
                  value: event.target.value,
                });
              }}
              onChange={(event) => updateDraft("costCap", event.target.value)}
              step="0.01"
              type="number"
              value={values.costCap}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <IconMail className="size-4 text-muted-foreground" />
              Emails / Day
            </CardTitle>
            <CardDescription className="text-xs">
              Max outbound emails daily
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              aria-label="Maximum outbound emails per day"
              className="font-mono"
              disabled={disabled}
              id="email-limit"
              min={0}
              onBlur={async (event) => {
                await commitLimitValue({
                  field: "emailDailyLimit",
                  inputKey: "emailLimit",
                  invalidMessage: "Email limit must be 0 or greater",
                  parse: parseNonNegativeInteger,
                  value: event.target.value,
                });
              }}
              onChange={(event) =>
                updateDraft("emailLimit", event.target.value)
              }
              type="number"
              value={values.emailLimit}
            />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
