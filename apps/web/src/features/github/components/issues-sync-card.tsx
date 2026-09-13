"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import { Switch } from "@ctrl-ui/react/ui/switch";
import { ArrowsClockwise, Spinner } from "@phosphor-icons/react";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/typography";

const PROMOTE_TRIGGERS = [
  { label: "Manually", value: "manual" },
  { label: "When status becomes…", value: "on_status" },
  { label: "On every new feedback", value: "on_create" },
] as const;

const PROMOTE_STATUSES = [
  { label: "Open", value: "open" },
  { label: "Under review", value: "under_review" },
  { label: "Planned", value: "planned" },
  { label: "In progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Closed", value: "closed" },
] as const;

export type PromoteTrigger = (typeof PROMOTE_TRIGGERS)[number]["value"];
export type PromoteStatus = (typeof PROMOTE_STATUSES)[number]["value"];

const DEFAULT_PROMOTE_STATUS: PromoteStatus = "planned";

const isPromoteTrigger = (value: unknown): value is PromoteTrigger =>
  PROMOTE_TRIGGERS.some((trigger) => trigger.value === value);

const isPromoteStatus = (value: unknown): value is PromoteStatus =>
  PROMOTE_STATUSES.some((status) => status.value === value);

interface IssuesSyncCardProps {
  autoSync: boolean;
  importedCount: number;
  isAdmin: boolean;
  isEnabled: boolean;
  isSyncing: boolean;
  lastSyncAt?: number;
  lastSyncStatus?: string;
  mappingsCount: number;
  onPromoteTriggerChange: (
    trigger: PromoteTrigger,
    status: PromoteStatus | undefined
  ) => void;
  onSyncNow: () => void;
  onToggleSync: (enabled: boolean, autoSync: boolean) => void;
  promoteStatus?: PromoteStatus;
  promoteTrigger: PromoteTrigger;
  syncedIssuesCount: number;
}

export function IssuesSyncSection({
  isEnabled,
  autoSync,
  lastSyncAt,
  lastSyncStatus,
  syncedIssuesCount,
  importedCount,
  mappingsCount,
  isSyncing,
  isAdmin,
  onToggleSync,
  onSyncNow,
  onPromoteTriggerChange,
  promoteStatus,
  promoteTrigger,
}: IssuesSyncCardProps) {
  const statusForTrigger = promoteStatus ?? DEFAULT_PROMOTE_STATUS;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="promote-trigger">Create GitHub issues</Label>
          <Text className="text-muted-foreground text-sm">
            When feedback becomes an issue in the connected repository
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Select
            disabled={!isAdmin}
            onValueChange={(value) => {
              if (isPromoteTrigger(value)) {
                onPromoteTriggerChange(
                  value,
                  value === "on_status" ? statusForTrigger : undefined
                );
              }
            }}
            value={promoteTrigger}
          >
            <SelectTrigger className="w-52" id="promote-trigger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROMOTE_TRIGGERS.map((trigger) => (
                <SelectItem key={trigger.value} value={trigger.value}>
                  {trigger.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {promoteTrigger === "on_status" ? (
            <Select
              disabled={!isAdmin}
              onValueChange={(value) => {
                if (isPromoteStatus(value)) {
                  onPromoteTriggerChange("on_status", value);
                }
              }}
              value={statusForTrigger}
            >
              <SelectTrigger aria-label="Promote status" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROMOTE_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="issues-sync">Enable issue sync</Label>
          <Text className="text-muted-foreground text-sm">
            Import GitHub issues based on label mappings
          </Text>
        </div>
        <Switch
          checked={isEnabled}
          disabled={!isAdmin}
          id="issues-sync"
          onCheckedChange={(checked) => onToggleSync(checked, autoSync)}
        />
      </div>

      {isEnabled ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-import-issues">Auto-import issues</Label>
              <Text className="text-muted-foreground text-sm">
                Automatically import new issues that match label mappings
              </Text>
            </div>
            <Switch
              checked={autoSync}
              disabled={!isAdmin}
              id="auto-import-issues"
              onCheckedChange={(checked) => onToggleSync(isEnabled, checked)}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 rounded-lg border bg-muted/50 p-4">
            <div className="text-center">
              <Text className="font-semibold text-2xl">
                {syncedIssuesCount}
              </Text>
              <Text className="text-muted-foreground text-sm">
                Issues synced
              </Text>
            </div>
            <div className="text-center">
              <Text className="font-semibold text-2xl">{importedCount}</Text>
              <Text className="text-muted-foreground text-sm">
                Imported to boards
              </Text>
            </div>
            <div className="text-center">
              <Text className="font-semibold text-2xl">{mappingsCount}</Text>
              <Text className="text-muted-foreground text-sm">
                Label mappings
              </Text>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isAdmin ? (
              <Button
                disabled={isSyncing}
                onClick={onSyncNow}
                variant="surface"
              >
                {isSyncing ? (
                  <Spinner className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowsClockwise className="mr-2 h-4 w-4" />
                )}
                Sync Issues Now
              </Button>
            ) : null}
            <div className="flex items-center gap-2">
              {lastSyncAt ? (
                <Text className="text-muted-foreground text-sm">
                  Last synced: {new Date(lastSyncAt).toLocaleString()}
                </Text>
              ) : null}
              {lastSyncStatus === "error" ? (
                <Badge color="red">Error</Badge>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
