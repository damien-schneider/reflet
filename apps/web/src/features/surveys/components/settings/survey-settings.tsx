"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { NativeSelect } from "@ctrl-ui/react/ui/native-select";
import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import { SURVEY_POSITIONS, type SurveyPosition } from "@reflet/survey-core";
import { useMutation } from "convex/react";
import { type FormEvent, type ReactNode, useState } from "react";
import { H3 } from "@/components/ui/typography";
import { AudienceFields } from "@/features/surveys/components/settings/audience-fields";
import { TriggerFields } from "@/features/surveys/components/settings/trigger-fields";
import { TriggerPicker } from "@/features/surveys/components/settings/trigger-picker";
import { convexErrorMessage } from "@/features/surveys/lib/convex-error-message";
import {
  type SettingsDraft,
  type SettingsSurvey,
  settingsIssues,
  settingsToUpdate,
  toSettingsDraft,
} from "@/features/surveys/lib/settings/settings-draft";

const POSITION_LABELS: Record<SurveyPosition, string> = {
  bottom_left: "Bottom left",
  bottom_right: "Bottom right",
  center: "Center of the screen",
};

const isSurveyPosition = (value: string): value is SurveyPosition =>
  SURVEY_POSITIONS.some((position) => position === value);

function SettingsSection({
  children,
  description,
  id,
  title,
}: {
  children: ReactNode;
  description: string;
  id: string;
  title: string;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <H3 id={id}>{title}</H3>
        <p className="text-pretty text-muted-foreground text-sm">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

export function SurveySettings({ survey }: { survey: SettingsSurvey }) {
  const updateSurvey = useMutation(api.surveys.mutations.update);
  const baseline = toSettingsDraft(survey);
  const [draft, setDraft] = useState(baseline);
  const [isSaving, setIsSaving] = useState(false);

  const issues = settingsIssues(draft);
  const hasIssues = Object.keys(issues).length > 0;
  const isDirty =
    hasIssues ||
    JSON.stringify(settingsToUpdate(draft, survey)) !==
      JSON.stringify(settingsToUpdate(baseline, survey));

  const updateDraft = (patch: Partial<SettingsDraft>) =>
    setDraft((previous) => ({ ...previous, ...patch }));

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (hasIssues || !isDirty) {
      return;
    }
    setIsSaving(true);
    try {
      await updateSurvey(settingsToUpdate(draft, survey));
      toast.success("Settings saved");
    } catch (error) {
      toast.error(
        convexErrorMessage(error, "Couldn’t save settings. Try again.")
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      className="flex max-w-2xl flex-col gap-10 pb-24"
      noValidate
      onSubmit={handleSave}
    >
      <SettingsSection
        description="What respondents see at the top of the survey."
        id="settings-general"
        title="General"
      >
        <Field invalid={Boolean(issues.title)}>
          <FieldLabel htmlFor="settings-title">Title</FieldLabel>
          <Input
            id="settings-title"
            onChange={(event) => updateDraft({ title: event.target.value })}
            value={draft.title}
          />
          <FieldError match={Boolean(issues.title)}>{issues.title}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="settings-description">Description</FieldLabel>
          <Input
            id="settings-description"
            onChange={(event) =>
              updateDraft({ description: event.target.value })
            }
            placeholder="Optional"
            value={draft.description}
          />
        </Field>
      </SettingsSection>

      <SettingsSection
        description="Choose the moment this survey appears in your app."
        id="settings-trigger"
        title="Trigger"
      >
        <TriggerPicker
          density="compact"
          labelledBy="settings-trigger"
          onChange={(triggerType) => updateDraft({ triggerType })}
          value={draft.triggerType}
        />
        <TriggerFields
          draft={draft}
          issues={issues}
          onChange={updateDraft}
          surveyId={survey._id}
        />
      </SettingsSection>

      <SettingsSection
        description="Decide who sees it, how often, and for how long it runs."
        id="settings-audience"
        title="Audience and frequency"
      >
        <AudienceFields draft={draft} issues={issues} onChange={updateDraft} />
      </SettingsSection>

      <SettingsSection
        description="Where the survey opens in your app. Hosted links always show it full page."
        id="settings-appearance"
        title="Appearance"
      >
        <Field>
          <FieldLabel htmlFor="settings-position">Position</FieldLabel>
          <NativeSelect
            className="w-full sm:w-64"
            id="settings-position"
            onChange={(event) => {
              if (isSurveyPosition(event.target.value)) {
                updateDraft({ position: event.target.value });
              }
            }}
            value={draft.position}
          >
            {SURVEY_POSITIONS.map((position) => (
              <option key={position} value={position}>
                {POSITION_LABELS[position]}
              </option>
            ))}
          </NativeSelect>
          <FieldDescription>
            Center opens as a dialog over the page.
          </FieldDescription>
        </Field>
      </SettingsSection>

      {isDirty ? (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-3 pl-4 shadow-sm">
          <p className="text-sm" role="status">
            {hasIssues
              ? "Fix the highlighted fields to save."
              : "You have unsaved changes."}
          </p>
          <div className="flex items-center gap-2">
            <Button
              disabled={isSaving}
              onClick={() => setDraft(baseline)}
              type="button"
              variant="ghost"
            >
              Reset
            </Button>
            <Button
              disabled={hasIssues || isSaving}
              tone="primary"
              type="submit"
              variant="solid"
            >
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
