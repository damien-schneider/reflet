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
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/typography";
import { SettingSwitchRow } from "./setting-switch-row";

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
  return (
    <div className="space-y-4">
      <PromoteTriggerRow
        isAdmin={isAdmin}
        onPromoteTriggerChange={onPromoteTriggerChange}
        promoteStatus={promoteStatus}
        promoteTrigger={promoteTrigger}
      />

      <SettingSwitchRow
        checked={isEnabled}
        description="Import GitHub issues based on label mappings"
        disabled={!isAdmin}
        id="issues-sync"
        label="Sync issues from GitHub"
        onCheckedChange={(checked) => onToggleSync(checked, autoSync)}
      />

      {isEnabled ? (
        <>
          <SettingSwitchRow
            checked={autoSync}
            description="Automatically import new issues that match label mappings"
            disabled={!isAdmin}
            id="auto-import-issues"
            label="Auto-import issues"
            onCheckedChange={(checked) => onToggleSync(isEnabled, checked)}
          />

          <dl className="grid grid-cols-3 gap-4 rounded-lg border bg-muted/50 p-4 text-center">
            <IssueSyncStat label="Issues synced" value={syncedIssuesCount} />
            <IssueSyncStat label="Imported to boards" value={importedCount} />
            <IssueSyncStat label="Label mappings" value={mappingsCount} />
          </dl>

          <SyncIssuesActions
            isAdmin={isAdmin}
            isSyncing={isSyncing}
            lastSyncAt={lastSyncAt}
            lastSyncStatus={lastSyncStatus}
            onSyncNow={onSyncNow}
          />
        </>
      ) : null}
    </div>
  );
}

function SyncIssuesActions({
  isAdmin,
  isSyncing,
  lastSyncAt,
  lastSyncStatus,
  onSyncNow,
}: Pick<
  IssuesSyncCardProps,
  "isAdmin" | "isSyncing" | "lastSyncAt" | "lastSyncStatus" | "onSyncNow"
>) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {isAdmin ? (
        <Button disabled={isSyncing} onClick={onSyncNow} variant="surface">
          {isSyncing ? (
            <Spinner data-icon="inline-start" size="xs" />
          ) : (
            <ArrowsClockwise
              aria-hidden="true"
              className="size-4"
              data-icon="inline-start"
            />
          )}
          Sync issues now
        </Button>
      ) : null}
      <div aria-live="polite" className="flex items-center gap-2">
        {isSyncing ? (
          <Text className="text-muted-foreground" variant="bodySmall">
            Syncing issues…
          </Text>
        ) : null}
        {!isSyncing && lastSyncAt ? (
          <Text
            className="text-muted-foreground tabular-nums"
            variant="bodySmall"
          >
            Last synced {format(lastSyncAt, "PPp")}
          </Text>
        ) : null}
        {!isSyncing && lastSyncStatus === "error" ? (
          <Badge color="red" size="sm">
            Last sync failed
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

function PromoteTriggerRow({
  isAdmin,
  onPromoteTriggerChange,
  promoteStatus,
  promoteTrigger,
}: Pick<
  IssuesSyncCardProps,
  "isAdmin" | "onPromoteTriggerChange" | "promoteStatus" | "promoteTrigger"
>) {
  const statusForTrigger = promoteStatus ?? DEFAULT_PROMOTE_STATUS;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <Label htmlFor="promote-trigger">Create GitHub issues</Label>
        <Text className="text-muted-foreground" variant="bodySmall">
          When feedback becomes an issue in the connected repository
        </Text>
      </div>
      <div className="flex flex-wrap items-center gap-2">
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
            <SelectTrigger
              aria-label="Status that creates the issue"
              className="w-40"
            >
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
  );
}

function IssueSyncStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="font-semibold text-2xl tabular-nums">{value}</dd>
    </div>
  );
}
