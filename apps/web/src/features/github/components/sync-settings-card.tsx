"use client";

import { Alert, AlertDescription, AlertTitle } from "@ctrl-ui/react/ui/alert";
import { Button } from "@ctrl-ui/react/ui/button";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { ArrowsClockwise, Warning, X } from "@phosphor-icons/react";
import { format } from "date-fns";
import { Text } from "@/components/ui/typography";

import { GitHubPermissionErrorAlert } from "./github-permission-error-alert";
import { SettingSwitchRow } from "./setting-switch-row";

interface SyncSettingsCardProps {
  autoSyncEnabled: boolean;
  error?: { code: string; message: string } | null;
  isAdmin: boolean;
  isSettingUp?: boolean;
  isSyncing: boolean;
  lastSyncAt?: number;
  onClearError?: () => void;
  onResyncGitHub?: () => void;
  onSyncNow: () => void;
  onToggleAutoSync: (enabled: boolean) => void;
}

const ERROR_TITLE = "Unable to turn on auto-sync";

function SyncSettingsError({
  error,
  onClearError,
  onResyncGitHub,
}: Pick<SyncSettingsCardProps, "onClearError" | "onResyncGitHub"> & {
  error: { code: string; message: string };
}) {
  if (error.code === "GITHUB_PERMISSION_DENIED" && onResyncGitHub) {
    return (
      <GitHubPermissionErrorAlert
        message="The Reflet GitHub App can’t create webhooks on this repository yet."
        onDismiss={onClearError}
        onResync={onResyncGitHub}
        title={ERROR_TITLE}
      />
    );
  }

  return (
    <Alert className="pr-10" variant="destructive">
      <Warning aria-hidden="true" />
      <AlertTitle>{ERROR_TITLE}</AlertTitle>
      <AlertDescription>
        <p className="text-pretty">{error.message}</p>
        {error.code === "LOCALHOST_NOT_SUPPORTED" ? (
          <p className="mt-2 text-pretty text-muted-foreground">
            Try again in a deployed environment or use a tunneling service like
            ngrok for local development.
          </p>
        ) : null}
      </AlertDescription>
      {onClearError ? (
        <div className="absolute top-2 right-2">
          <Button iconOnly onClick={onClearError} size="xs" variant="ghost">
            <X aria-hidden="true" className="size-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      ) : null}
    </Alert>
  );
}

export function SyncSettingsSection({
  autoSyncEnabled,
  lastSyncAt,
  isSyncing,
  isSettingUp = false,
  isAdmin,
  error,
  onToggleAutoSync,
  onSyncNow,
  onClearError,
  onResyncGitHub,
}: SyncSettingsCardProps) {
  return (
    <div className="space-y-4">
      {error ? (
        <SyncSettingsError
          error={error}
          onClearError={onClearError}
          onResyncGitHub={onResyncGitHub}
        />
      ) : null}

      <SettingSwitchRow
        checked={autoSyncEnabled}
        description="Automatically import new releases to your changelog"
        disabled={!isAdmin || isSettingUp}
        id="auto-sync"
        label="Auto-sync releases"
        onCheckedChange={onToggleAutoSync}
        status={
          isSettingUp ? (
            <>
              <Spinner size="xs" />
              <span className="sr-only" role="status">
                Turning on auto-sync…
              </span>
            </>
          ) : null
        }
      />

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
            Sync now
          </Button>
        ) : null}
        <Text
          aria-live="polite"
          className="text-muted-foreground tabular-nums"
          variant="bodySmall"
        >
          {isSyncing ? "Syncing releases…" : null}
          {!isSyncing && lastSyncAt
            ? `Last synced ${format(lastSyncAt, "PPp")}`
            : null}
        </Text>
      </div>
    </div>
  );
}
