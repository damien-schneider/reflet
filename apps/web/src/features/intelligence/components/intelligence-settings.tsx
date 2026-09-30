"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Switch } from "@ctrl-ui/react/ui/switch";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { format, formatDistanceToNow } from "date-fns";
import { useId, useState } from "react";
import { Label } from "@/components/ui/label";

const SCAN_FREQUENCIES = ["daily", "twice_weekly", "weekly"] as const;
type ScanFrequency = (typeof SCAN_FREQUENCIES)[number];

const isScanFrequency = (value: string): value is ScanFrequency =>
  (SCAN_FREQUENCIES as readonly string[]).includes(value);

const SCAN_FREQUENCY_LABELS: Record<ScanFrequency, string> = {
  daily: "Daily",
  twice_weekly: "Twice per week",
  weekly: "Weekly",
};

const formatFutureTime = (timestamp: number): string => {
  const diffMs = timestamp - Date.now();
  if (diffMs <= 0) {
    return "soon";
  }
  const diffMinutes = Math.floor(diffMs / 1000 / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `in ${diffDays}d`;
  }
  if (diffHours > 0) {
    return `in ${diffHours}h`;
  }
  return `in ${diffMinutes}m`;
};

interface Draft {
  communityEnabled?: boolean;
  competitorTrackingEnabled?: boolean;
  scanFrequency?: ScanFrequency;
}

function SettingSwitch({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="flex flex-col gap-1">
        <Label htmlFor={id}>{label}</Label>
        <p
          className="text-pretty text-muted-foreground text-xs"
          id={`${id}-description`}
        >
          {description}
        </p>
      </div>
      <Switch
        aria-describedby={`${id}-description`}
        checked={checked}
        id={id}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

function ScanSchedule({
  lastScanAt,
  nextScanAt,
}: {
  lastScanAt: number;
  nextScanAt?: number;
}) {
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs tabular-nums">
      <span>
        Last scan{" "}
        <time
          dateTime={new Date(lastScanAt).toISOString()}
          title={format(lastScanAt, "PPpp")}
        >
          {formatDistanceToNow(lastScanAt, { addSuffix: true })}
        </time>
      </span>
      {nextScanAt ? (
        <span>
          Next scan{" "}
          <time
            dateTime={new Date(nextScanAt).toISOString()}
            title={format(nextScanAt, "PPpp")}
          >
            {formatFutureTime(nextScanAt)}
          </time>
        </span>
      ) : null}
    </p>
  );
}

type SaveState = "idle" | "saved" | "error";

type IntelligenceConfig = FunctionReturnType<
  typeof api.intelligence.config.get
>;

function resolveConfigValues(
  config: IntelligenceConfig | undefined,
  draft: Draft
) {
  const savedFrequency =
    config && isScanFrequency(config.scanFrequency)
      ? config.scanFrequency
      : "weekly";
  return {
    communityEnabled:
      draft.communityEnabled ??
      Boolean(config?.redditEnabled || config?.webSearchEnabled),
    competitorTrackingEnabled:
      draft.competitorTrackingEnabled ??
      config?.competitorTrackingEnabled ??
      false,
    scanFrequency: draft.scanFrequency ?? savedFrequency,
  };
}

function useIntelligenceConfigDraft(organizationId: Id<"organizations">) {
  const config = useQuery(api.intelligence.config.get, { organizationId });
  const updateConfig = useMutation(api.intelligence.config.update);
  const getOrCreate = useMutation(api.intelligence.config.getOrCreate);

  const [draft, setDraft] = useState<Draft>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const values = resolveConfigValues(config, draft);

  const edit = (patch: Draft) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setSaveState("idle");
  };

  const save = async () => {
    if (config === undefined) {
      return;
    }
    setIsSaving(true);
    try {
      if (config === null) {
        await getOrCreate({ organizationId });
      }
      await updateConfig({
        competitorTrackingEnabled: values.competitorTrackingEnabled,
        organizationId,
        redditEnabled: values.communityEnabled,
        scanFrequency: values.scanFrequency,
        webSearchEnabled: values.communityEnabled,
      });
      setDraft({});
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
    setIsSaving(false);
  };

  return {
    config,
    edit,
    isDirty: config === null || Object.keys(draft).length > 0,
    isSaving,
    save,
    saveState,
    values,
  };
}

function IntelligenceSettingsSkeleton() {
  return (
    <div
      aria-label="Loading intelligence settings"
      className="space-y-6"
      role="status"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-full" />
      </div>
      {["a", "b"].map((id) => (
        <div className="flex items-center justify-between gap-6" key={id}>
          <div className="flex flex-1 flex-col gap-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>
      ))}
      <Skeleton className="h-9 w-24" />
    </div>
  );
}

function ScanFrequencyField({
  value,
  onChange,
}: {
  value: ScanFrequency;
  onChange: (value: ScanFrequency) => void;
}) {
  const frequencyId = useId();
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={frequencyId}>Scan frequency</Label>
      <Select
        onValueChange={(next) => {
          if (next && isScanFrequency(next)) {
            onChange(next);
          }
        }}
        value={value}
      >
        <SelectTrigger id={frequencyId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SCAN_FREQUENCIES.map((frequency) => (
            <SelectItem key={frequency} value={frequency}>
              {SCAN_FREQUENCY_LABELS[frequency]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SaveStatusMessage({ saveState }: { saveState: SaveState }) {
  return (
    <p aria-live="polite" className="text-xs" role="status">
      {saveState === "saved" && (
        <span className="text-muted-foreground">Saved</span>
      )}
      {saveState === "error" && (
        <span className="text-destructive-text">
          Couldn’t save. Check your connection and try again.
        </span>
      )}
    </p>
  );
}

interface IntelligenceSettingsProps {
  organizationId: Id<"organizations">;
}

export function IntelligenceSettings({
  organizationId,
}: IntelligenceSettingsProps) {
  const { config, edit, isDirty, isSaving, save, saveState, values } =
    useIntelligenceConfigDraft(organizationId);

  if (config === undefined) {
    return <IntelligenceSettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <ScanFrequencyField
        onChange={(scanFrequency) => edit({ scanFrequency })}
        value={values.scanFrequency}
      />

      <SettingSwitch
        checked={values.competitorTrackingEnabled}
        description="Monitor competitors’ product and pricing updates."
        label="Competitor tracking"
        onCheckedChange={(checked) =>
          edit({ competitorTrackingEnabled: checked })
        }
      />
      <SettingSwitch
        checked={values.communityEnabled}
        description="Find pain points and feature requests on Reddit and the web."
        label="Community monitoring"
        onCheckedChange={(checked) => edit({ communityEnabled: checked })}
      />

      {config?.lastScanAt ? (
        <ScanSchedule
          lastScanAt={config.lastScanAt}
          nextScanAt={config.nextScanAt}
        />
      ) : null}

      <div className="flex items-center gap-3">
        <Button
          disabled={isSaving || !isDirty}
          onClick={save}
          tone="primary"
          variant="solid"
        >
          {isSaving && <Spinner data-icon="inline-start" size="xs" />}
          {config === null ? "Enable intelligence" : "Save changes"}
        </Button>
        <SaveStatusMessage saveState={saveState} />
      </div>
    </div>
  );
}
