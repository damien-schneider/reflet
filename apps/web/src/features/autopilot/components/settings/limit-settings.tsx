"use client";

import {
  IconCurrencyDollar,
  IconMail,
  IconRobot,
  IconShieldCheck,
} from "@tabler/icons-react";

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
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? undefined : parsed;
}

function parseNonNegativeFloat(value: string): number | undefined {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) || parsed < 0 ? undefined : parsed;
}

function parseNonNegativeInteger(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 0 ? undefined : parsed;
}

export function LimitSettings({
  dailyCostCapUsd,
  disabled,
  emailDailyLimit,
  maxTasksPerDay,
  onUpdate,
}: {
  dailyCostCapUsd: number | undefined;
  disabled: boolean;
  emailDailyLimit: number | undefined;
  maxTasksPerDay: number;
  onUpdate: (field: string, value: number) => void;
}) {
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
              defaultValue={maxTasksPerDay}
              disabled={disabled}
              id="max-tasks"
              min={1}
              onBlur={(event) => {
                const value = parsePositiveInteger(event.target.value);
                if (value !== undefined) {
                  onUpdate("maxTasksPerDay", value);
                }
              }}
              type="number"
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
              defaultValue={dailyCostCapUsd ?? ""}
              disabled={disabled}
              id="cost-cap"
              min={0}
              onBlur={(event) => {
                const value = parseNonNegativeFloat(event.target.value);
                if (value !== undefined) {
                  onUpdate("dailyCostCapUsd", value);
                }
              }}
              step="0.01"
              type="number"
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
              defaultValue={emailDailyLimit ?? 20}
              disabled={disabled}
              id="email-limit"
              min={0}
              onBlur={(event) => {
                const value = parseNonNegativeInteger(event.target.value);
                if (value !== undefined) {
                  onUpdate("emailDailyLimit", value);
                }
              }}
              type="number"
            />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
