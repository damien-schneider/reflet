"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

const SCAN_FREQUENCIES = ["daily", "twice_weekly", "weekly"] as const;
type ScanFrequency = (typeof SCAN_FREQUENCIES)[number];

const isScanFrequency = (value: string): value is ScanFrequency =>
  (SCAN_FREQUENCIES as readonly string[]).includes(value);

const SCAN_FREQUENCY_LABELS: Record<ScanFrequency, string> = {
  daily: "Daily",
  twice_weekly: "Twice per week",
  weekly: "Weekly",
};

const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}d ago`;
  }
  if (diffHours > 0) {
    return `${diffHours}h ago`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes}m ago`;
  }
  return "just now";
};

const formatFutureTime = (timestamp: number): string => {
  const now = Date.now();
  const diffMs = timestamp - now;

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

interface IntelligenceSettingsProps {
  organizationId: Id<"organizations">;
}

export function IntelligenceSettings({
  organizationId,
}: IntelligenceSettingsProps) {
  const config = useQuery(api.intelligence.config.get, {
    organizationId,
  });
  const updateConfig = useMutation(api.intelligence.config.update);
  const getOrCreate = useMutation(api.intelligence.config.getOrCreate);

  const [scanFrequency, setScanFrequency] = useState<ScanFrequency>("weekly");
  const [competitorTrackingEnabled, setCompetitorTrackingEnabled] =
    useState(false);
  const [redditEnabled, setRedditEnabled] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!config) {
      return;
    }
    setScanFrequency(
      isScanFrequency(config.scanFrequency) ? config.scanFrequency : "weekly"
    );
    setCompetitorTrackingEnabled(config.competitorTrackingEnabled ?? false);
    setRedditEnabled(config.redditEnabled ?? false);
    setWebSearchEnabled(config.webSearchEnabled ?? false);
  }, [config]);

  const handleSave = async () => {
    if (config === undefined) {
      return;
    }

    setIsSaving(true);
    try {
      if (config === null) {
        await getOrCreate({ organizationId });
      }
      await updateConfig({
        competitorTrackingEnabled,
        organizationId,
        redditEnabled,
        scanFrequency,
        webSearchEnabled,
      });
      toast.success(
        config === null ? "Intelligence enabled" : "Settings saved"
      );
    } catch (error) {
      toast.error("Failed to save settings", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (config === undefined) {
    return <Skeleton className="h-64 w-full" />;
  }
  const saveLabel = config === null ? "Enable intelligence" : "Save";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="scan-frequency">Scan frequency</Label>
        <Select
          onValueChange={(value) => {
            if (value && isScanFrequency(value)) {
              setScanFrequency(value);
            }
          }}
          value={scanFrequency}
        >
          <SelectTrigger id="scan-frequency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">{SCAN_FREQUENCY_LABELS.daily}</SelectItem>
            <SelectItem value="twice_weekly">
              {SCAN_FREQUENCY_LABELS.twice_weekly}
            </SelectItem>
            <SelectItem value="weekly">
              {SCAN_FREQUENCY_LABELS.weekly}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-6">
        <div>
          <Label>Competitor tracking</Label>
          <p className="mt-1 text-muted-foreground text-xs">
            Monitor product and pricing updates.
          </p>
        </div>
        <Switch
          aria-label="Competitor tracking"
          checked={competitorTrackingEnabled}
          onCheckedChange={setCompetitorTrackingEnabled}
        />
      </div>

      <div className="flex items-center justify-between gap-6">
        <div>
          <Label>Community monitoring</Label>
          <p className="mt-1 text-muted-foreground text-xs">
            Find pain points and feature requests.
          </p>
        </div>
        <Switch
          aria-label="Community monitoring"
          checked={redditEnabled || webSearchEnabled}
          onCheckedChange={(checked) => {
            setRedditEnabled(checked);
            setWebSearchEnabled(checked);
          }}
        />
      </div>

      {config?.lastScanAt ? (
        <div className="flex items-center gap-4 text-muted-foreground text-xs">
          <span>Last scan: {formatRelativeTime(config.lastScanAt)}</span>
          {config.nextScanAt ? (
            <span>Next scan: {formatFutureTime(config.nextScanAt)}</span>
          ) : null}
        </div>
      ) : null}

      <Button disabled={isSaving} onClick={handleSave}>
        {isSaving ? "Saving..." : saveLabel}
      </Button>
    </div>
  );
}
