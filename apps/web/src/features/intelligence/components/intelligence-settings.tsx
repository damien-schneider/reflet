"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const config = useQuery(api.autopilot.intelligence.config.get, {
    organizationId,
  });
  const updateConfig = useMutation(api.autopilot.intelligence.config.update);
  const getOrCreate = useMutation(
    api.autopilot.intelligence.config.getOrCreate
  );

  const [scanFrequency, setScanFrequency] = useState<ScanFrequency>("weekly");
  const [competitorTrackingEnabled, setCompetitorTrackingEnabled] =
    useState(false);
  const [redditEnabled, setRedditEnabled] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(
    function initializeConfig() {
      if (!(config || initialized)) {
        getOrCreate({
          organizationId,
        }).catch(() => {
          // Config creation handled silently
        });
      }
    },
    [config, initialized, getOrCreate, organizationId]
  );

  useEffect(
    function syncStateFromConfig() {
      if (config) {
        setScanFrequency(
          isScanFrequency(config.scanFrequency)
            ? config.scanFrequency
            : "weekly"
        );
        setCompetitorTrackingEnabled(config.competitorTrackingEnabled ?? false);
        setRedditEnabled(config.redditEnabled ?? false);
        setWebSearchEnabled(config.webSearchEnabled ?? false);
        setInitialized(true);
      }
    },
    [config]
  );

  const handleSave = async () => {
    if (!config?._id) {
      return;
    }

    setIsSaving(true);
    try {
      await updateConfig({
        organizationId,
        scanFrequency,
        competitorTrackingEnabled,
        redditEnabled,
        webSearchEnabled,
      });
      toast.success("Settings saved");
    } catch (error) {
      toast.error("Failed to save settings", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intelligence Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label>Scan Frequency</Label>
            <Select
              onValueChange={(value) => {
                if (value && isScanFrequency(value)) {
                  setScanFrequency(value);
                }
              }}
              value={scanFrequency}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">
                  {SCAN_FREQUENCY_LABELS.daily}
                </SelectItem>
                <SelectItem value="twice_weekly">
                  {SCAN_FREQUENCY_LABELS.twice_weekly}
                </SelectItem>
                <SelectItem value="weekly">
                  {SCAN_FREQUENCY_LABELS.weekly}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <Label>Competitor Tracking</Label>
                <p className="text-muted-foreground text-xs">
                  AI monitors competitor websites for product updates, pricing
                  changes, and new features
                </p>
              </div>
              <Switch
                checked={competitorTrackingEnabled}
                onCheckedChange={setCompetitorTrackingEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <Label>Community Monitoring</Label>
                <p className="text-muted-foreground text-xs">
                  AI searches Reddit, forums, and the web for pain points,
                  feature requests, and market discussions. No API keys needed.
                </p>
              </div>
              <Switch
                checked={redditEnabled || webSearchEnabled}
                onCheckedChange={(checked) => {
                  setRedditEnabled(checked);
                  setWebSearchEnabled(checked);
                }}
              />
            </div>
          </div>

          <div className="rounded-lg border border-dashed p-4">
            <div className="flex flex-col gap-0.5">
              <Label>Manual & Automatic Scanning</Label>
              <p className="text-muted-foreground text-xs">
                Scans run automatically on the schedule above when at least one
                pipeline is enabled. You can also run a scan manually at any
                time from the Intelligence page.
              </p>
            </div>
          </div>

          {config?.lastScanAt && (
            <div className="flex items-center gap-4 text-muted-foreground text-xs">
              <span>Last scan: {formatRelativeTime(config.lastScanAt)}</span>
              {config.nextScanAt && (
                <span>Next scan: {formatFutureTime(config.nextScanAt)}</span>
              )}
            </div>
          )}

          <Button disabled={isSaving || !config?._id} onClick={handleSave}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
