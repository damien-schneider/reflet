"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { H3 } from "@/components/ui/typography";
import { TriggerPicker } from "@/features/surveys/components/trigger-picker";
import { TRIGGER_DESCRIPTIONS } from "@/features/surveys/lib/constants";
import type { TriggerType } from "@/store/surveys";

interface SurveySettingsProps {
  survey: {
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
  };
}

export function SurveySettings({ survey }: SurveySettingsProps) {
  const updateSurvey = useMutation(api.surveys.mutations.update);

  const [title, setTitle] = useState(survey.title);
  const [description, setDescription] = useState(survey.description ?? "");
  const [triggerType, setTriggerType] = useState<TriggerType>(
    survey.triggerType
  );
  const [pageUrl, setPageUrl] = useState(survey.triggerConfig?.pageUrl ?? "");
  const [delayMs, setDelayMs] = useState(
    survey.triggerConfig?.delayMs?.toString() ?? ""
  );
  const [sampleRate, setSampleRate] = useState(
    survey.triggerConfig?.sampleRate?.toString() ?? "100"
  );
  const [maxResponses, setMaxResponses] = useState(
    survey.maxResponses?.toString() ?? ""
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSurvey({
        surveyId: survey._id,
        title: title.trim(),
        description: description.trim() || undefined,
        triggerType,
        triggerConfig: {
          pageUrl: pageUrl.trim() || undefined,
          delayMs: delayMs ? Number(delayMs) : undefined,
          sampleRate: sampleRate ? Number(sampleRate) : undefined,
        },
        maxResponses: maxResponses ? Number(maxResponses) : undefined,
      });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const showPageUrl =
    triggerType === "page_visit" || triggerType === "exit_intent";
  const showDelay = triggerType === "time_delay";
  const triggerHint = TRIGGER_DESCRIPTIONS[triggerType].hint;

  return (
    <div className="space-y-8">
      {/* General */}
      <section>
        <H3 className="mb-4">General</H3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-title">Title</Label>
            <Input
              id="settings-title"
              onChange={(e) => setTitle(e.target.value)}
              value={title}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-desc">Description</Label>
            <Input
              id="settings-desc"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
              value={description}
            />
          </div>
        </div>
      </section>

      {/* Trigger */}
      <section>
        <H3 className="mb-1">When to show</H3>
        <p className="mb-4 text-muted-foreground text-sm">
          Choose when this survey appears to your users.
        </p>
        <TriggerPicker onChange={setTriggerType} value={triggerType} />

        {/* Trigger-specific config */}
        {showPageUrl || showDelay ? (
          <div className="mt-4 flex flex-col gap-4 rounded-lg border bg-muted/20 p-4">
            <p className="text-muted-foreground text-xs">{triggerHint}</p>

            {showPageUrl ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="settings-page-url">Page URL pattern</Label>
                <Input
                  id="settings-page-url"
                  onChange={(e) => setPageUrl(e.target.value)}
                  placeholder="/pricing, /checkout/*"
                  value={pageUrl}
                />
                <p className="text-muted-foreground text-xs">
                  Supports wildcards. Leave empty to match all pages.
                </p>
              </div>
            ) : null}

            {showDelay ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="settings-delay">Delay</Label>
                <div className="flex items-center gap-2">
                  <Input
                    className="w-24"
                    id="settings-delay"
                    min="0"
                    onChange={(e) => setDelayMs(e.target.value)}
                    placeholder="5000"
                    type="number"
                    value={delayMs}
                  />
                  <span className="text-muted-foreground text-sm">
                    ms
                    {delayMs
                      ? ` (${(Number(delayMs) / 1000).toFixed(1)}s)`
                      : ""}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* Audience */}
      <section>
        <H3 className="mb-1">Audience</H3>
        <p className="mb-4 text-muted-foreground text-sm">
          Control how many users see this survey.
        </p>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-sample-rate">Sample rate</Label>
            <div className="flex items-center gap-2">
              <Input
                className="w-24"
                id="settings-sample-rate"
                max="100"
                min="1"
                onChange={(e) => setSampleRate(e.target.value)}
                type="number"
                value={sampleRate}
              />
              <span className="text-muted-foreground text-sm">
                % of visitors
                {sampleRate && Number(sampleRate) < 100
                  ? ` (roughly 1 in ${Math.round(100 / Number(sampleRate))})`
                  : ""}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-max-responses">Maximum responses</Label>
            <div className="flex items-center gap-2">
              <Input
                className="w-32"
                id="settings-max-responses"
                min="1"
                onChange={(e) => setMaxResponses(e.target.value)}
                placeholder="No limit"
                type="number"
                value={maxResponses}
              />
              {maxResponses ? (
                <span className="text-muted-foreground text-sm">
                  responses, then auto-pause
                </span>
              ) : (
                <span className="text-muted-foreground text-sm">
                  Leave empty for unlimited
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end border-t pt-4">
        <Button disabled={!title.trim() || isSaving} onClick={handleSave}>
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
