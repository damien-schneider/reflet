"use client";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { NativeSelect } from "@ctrl-ui/react/ui/native-select";
import {
  DISPLAY_FREQUENCIES,
  type DisplayFrequency,
} from "@reflet/survey-core";
import { ScheduleDateField } from "@/features/surveys/components/settings/schedule-date-field";
import {
  type SettingsDraft,
  type SettingsIssues,
  takesRecontactDays,
} from "@/features/surveys/lib/settings/settings-draft";

const PERCENT = 100;

const FREQUENCY_OPTIONS: Record<
  DisplayFrequency,
  { hint: string; label: string }
> = {
  once: {
    hint: "Each person sees it one time, whether they answer or close it.",
    label: "Show once",
  },
  recurring: {
    hint: "Shown again after the wait below, even to people who already answered.",
    label: "Recurring",
  },
  until_completed: {
    hint: "Shown again after the wait below until the person completes it.",
    label: "Until they complete it",
  },
};

const isDisplayFrequency = (value: string): value is DisplayFrequency =>
  DISPLAY_FREQUENCIES.some((frequency) => frequency === value);

interface AudienceFieldsProps {
  draft: SettingsDraft;
  issues: SettingsIssues;
  onChange: (patch: Partial<SettingsDraft>) => void;
}

export function AudienceFields({
  draft,
  issues,
  onChange,
}: AudienceFieldsProps) {
  const sampleRate = Number(draft.sampleRate);
  const showsSampleRatio = sampleRate >= 1 && sampleRate < PERCENT;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="settings-frequency">How often</FieldLabel>
          <NativeSelect
            className="w-full"
            id="settings-frequency"
            onChange={(event) => {
              if (isDisplayFrequency(event.target.value)) {
                onChange({ frequency: event.target.value });
              }
            }}
            value={draft.frequency}
          >
            {DISPLAY_FREQUENCIES.map((frequency) => (
              <option key={frequency} value={frequency}>
                {FREQUENCY_OPTIONS[frequency].label}
              </option>
            ))}
          </NativeSelect>
          <FieldDescription>
            {FREQUENCY_OPTIONS[draft.frequency].hint}
          </FieldDescription>
        </Field>

        {takesRecontactDays(draft.frequency) ? (
          <Field invalid={Boolean(issues.recontactDays)}>
            <FieldLabel htmlFor="settings-recontact">
              Wait before showing again
            </FieldLabel>
            <div className="flex items-center gap-2">
              <Input
                className="w-24 tabular-nums"
                id="settings-recontact"
                inputMode="numeric"
                min="1"
                onChange={(event) =>
                  onChange({ recontactDays: event.target.value })
                }
                step="1"
                type="number"
                value={draft.recontactDays}
              />
              <span className="text-muted-foreground text-sm">days</span>
            </div>
            <FieldError match={Boolean(issues.recontactDays)}>
              {issues.recontactDays}
            </FieldError>
          </Field>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field invalid={Boolean(issues.sampleRate)}>
          <FieldLabel htmlFor="settings-sample-rate">Sample rate</FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              className="w-24 tabular-nums"
              id="settings-sample-rate"
              inputMode="numeric"
              max="100"
              min="1"
              onChange={(event) => onChange({ sampleRate: event.target.value })}
              step="1"
              type="number"
              value={draft.sampleRate}
            />
            <span className="text-muted-foreground text-sm tabular-nums">
              % of visitors
              {showsSampleRatio
                ? `, about 1 in ${Math.round(PERCENT / sampleRate)}`
                : ""}
            </span>
          </div>
          <FieldDescription>
            The same person is always in or out, so results aren’t skewed.
          </FieldDescription>
          <FieldError match={Boolean(issues.sampleRate)}>
            {issues.sampleRate}
          </FieldError>
        </Field>

        <Field invalid={Boolean(issues.maxResponses)}>
          <FieldLabel htmlFor="settings-max-responses">
            Response limit
          </FieldLabel>
          <Input
            className="w-32 tabular-nums"
            id="settings-max-responses"
            inputMode="numeric"
            min="1"
            onChange={(event) => onChange({ maxResponses: event.target.value })}
            placeholder="No limit"
            step="1"
            type="number"
            value={draft.maxResponses}
          />
          <FieldDescription>
            The survey closes once this many people complete it. Leave empty for
            no limit.
          </FieldDescription>
          <FieldError match={Boolean(issues.maxResponses)}>
            {issues.maxResponses}
          </FieldError>
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-4">
          <ScheduleDateField
            edge="start"
            label="Starts"
            onChange={(startsAt) => onChange({ startsAt })}
            value={draft.startsAt}
          />
          <ScheduleDateField
            edge="end"
            error={issues.endsAt}
            label="Ends"
            onChange={(endsAt) => onChange({ endsAt })}
            value={draft.endsAt}
          />
        </div>
        <p className="text-pretty text-muted-foreground text-xs">
          Outside these dates the survey stays active but nobody sees it. Ends
          at the close of the chosen day.
        </p>
      </div>
    </div>
  );
}
