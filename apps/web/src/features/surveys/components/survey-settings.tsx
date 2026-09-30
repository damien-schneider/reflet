"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { Label } from "@/components/ui/label";
import { H3 } from "@/components/ui/typography";
import { TriggerPicker } from "@/features/surveys/components/trigger-picker";
import { TRIGGER_DESCRIPTIONS } from "@/features/surveys/lib/constants";
import type { TriggerType } from "@/store/surveys";

const MS_PER_SECOND = 1000;

export interface SettingsSurvey {
  _id: Id<"surveys">;
  description?: string;
  endsAt?: number;
  maxResponses?: number;
  startsAt?: number;
  title: string;
  triggerConfig?: {
    delayMs?: number;
    pageUrl?: string;
    sampleRate?: number;
  };
  triggerType: TriggerType;
}

interface SettingsDraft {
  delaySeconds: string;
  description: string;
  maxResponses: string;
  pageUrl: string;
  sampleRate: string;
  title: string;
  triggerType: TriggerType;
}

function toSettingsDraft(survey: SettingsSurvey): SettingsDraft {
  const delayMs = survey.triggerConfig?.delayMs;
  return {
    delaySeconds: delayMs === undefined ? "" : String(delayMs / MS_PER_SECOND),
    description: survey.description ?? "",
    maxResponses: survey.maxResponses?.toString() ?? "",
    pageUrl: survey.triggerConfig?.pageUrl ?? "",
    sampleRate: survey.triggerConfig?.sampleRate?.toString() ?? "100",
    title: survey.title,
    triggerType: survey.triggerType,
  };
}

export function SurveySettings({ survey }: { survey: SettingsSurvey }) {
  const updateSurvey = useMutation(api.surveys.mutations.update);

  const [draft, setDraft] = useState(() => toSettingsDraft(survey));
  const {
    title,
    description,
    triggerType,
    pageUrl,
    delaySeconds,
    sampleRate,
    maxResponses,
  } = draft;
  const updateDraft = (patch: Partial<SettingsDraft>) =>
    setDraft((previous) => ({ ...previous, ...patch }));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const settings = {
      description: description.trim() || undefined,
      maxResponses: maxResponses ? Number(maxResponses) : undefined,
      surveyId: survey._id,
      title: title.trim(),
      triggerConfig: {
        delayMs: delaySeconds
          ? Math.round(Number(delaySeconds) * MS_PER_SECOND)
          : undefined,
        pageUrl: pageUrl.trim() || undefined,
        sampleRate: sampleRate ? Number(sampleRate) : undefined,
      },
      triggerType,
    };
    setIsSaving(true);
    try {
      await updateSurvey(settings);
      toast.success("Settings saved");
    } catch {
      toast.error("Couldn’t save settings. Try again.");
    }
    setIsSaving(false);
  };

  return (
    <form className="max-w-2xl space-y-10" onSubmit={handleSave}>
      <section aria-labelledby="settings-general" className="space-y-4">
        <H3 id="settings-general">General</H3>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-title">Title</Label>
          <Input
            id="settings-title"
            onChange={(e) => updateDraft({ title: e.target.value })}
            required
            value={title}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-desc">Description</Label>
          <Input
            id="settings-desc"
            onChange={(e) => updateDraft({ description: e.target.value })}
            placeholder="What this survey is for"
            value={description}
          />
        </div>
      </section>

      <section aria-labelledby="settings-trigger" className="space-y-4">
        <div className="space-y-1">
          <H3 id="settings-trigger">When to show</H3>
          <p className="text-pretty text-muted-foreground text-sm">
            Choose when this survey appears to your users.
          </p>
        </div>
        <TriggerPicker
          labelledBy="settings-trigger"
          onChange={(value) => updateDraft({ triggerType: value })}
          value={triggerType}
        />
        <TriggerFields
          delaySeconds={delaySeconds}
          onDelayChange={(value) => updateDraft({ delaySeconds: value })}
          onPageUrlChange={(value) => updateDraft({ pageUrl: value })}
          pageUrl={pageUrl}
          triggerType={triggerType}
        />
      </section>

      <AudienceFields
        maxResponses={maxResponses}
        onMaxResponsesChange={(value) => updateDraft({ maxResponses: value })}
        onSampleRateChange={(value) => updateDraft({ sampleRate: value })}
        sampleRate={sampleRate}
      />

      <div className="flex justify-end border-t pt-4">
        <Button
          disabled={!title.trim() || isSaving}
          tone="primary"
          type="submit"
          variant="solid"
        >
          {isSaving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}

function TriggerFields({
  triggerType,
  pageUrl,
  onPageUrlChange,
  delaySeconds,
  onDelayChange,
}: {
  delaySeconds: string;
  onDelayChange: (value: string) => void;
  onPageUrlChange: (value: string) => void;
  pageUrl: string;
  triggerType: TriggerType;
}) {
  const showPageUrl =
    triggerType === "page_visit" || triggerType === "exit_intent";
  const showDelay = triggerType === "time_delay";

  if (!(showPageUrl || showDelay)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-4">
      <p className="text-pretty text-muted-foreground text-xs">
        {TRIGGER_DESCRIPTIONS[triggerType].hint}
      </p>
      {showPageUrl ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-page-url">Page URL pattern</Label>
          <Input
            aria-describedby="settings-page-url-hint"
            id="settings-page-url"
            onChange={(e) => onPageUrlChange(e.target.value)}
            placeholder="/pricing, /checkout/*"
            value={pageUrl}
          />
          <p
            className="text-muted-foreground text-xs"
            id="settings-page-url-hint"
          >
            Use * as a wildcard. Leave empty to match every page.
          </p>
        </div>
      ) : null}
      {showDelay ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-delay">Delay</Label>
          <div className="flex items-center gap-2">
            <Input
              className="w-24 tabular-nums"
              id="settings-delay"
              inputMode="decimal"
              min="0"
              onChange={(e) => onDelayChange(e.target.value)}
              placeholder="5"
              step="0.5"
              type="number"
              value={delaySeconds}
            />
            <span className="text-muted-foreground text-sm">seconds</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AudienceFields({
  sampleRate,
  onSampleRateChange,
  maxResponses,
  onMaxResponsesChange,
}: {
  maxResponses: string;
  onMaxResponsesChange: (value: string) => void;
  onSampleRateChange: (value: string) => void;
  sampleRate: string;
}) {
  const rate = Number(sampleRate);

  return (
    <section aria-labelledby="settings-audience" className="space-y-4">
      <div className="space-y-1">
        <H3 id="settings-audience">Audience</H3>
        <p className="text-pretty text-muted-foreground text-sm">
          Control how many users see this survey.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-sample-rate">Sample rate</Label>
        <div className="flex items-center gap-2">
          <Input
            className="w-24 tabular-nums"
            id="settings-sample-rate"
            max="100"
            min="1"
            onChange={(e) => onSampleRateChange(e.target.value)}
            type="number"
            value={sampleRate}
          />
          <span className="text-muted-foreground text-sm tabular-nums">
            % of visitors
            {rate > 0 && rate < 100
              ? ` (about 1 in ${Math.round(100 / rate)})`
              : ""}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-max-responses">Maximum responses</Label>
        <div className="flex items-center gap-2">
          <Input
            className="w-32 tabular-nums"
            id="settings-max-responses"
            min="1"
            onChange={(e) => onMaxResponsesChange(e.target.value)}
            placeholder="No limit"
            type="number"
            value={maxResponses}
          />
          <span className="text-muted-foreground text-sm">
            {maxResponses
              ? "Pauses automatically after this many"
              : "Leave empty for no limit"}
          </span>
        </div>
      </div>
    </section>
  );
}
