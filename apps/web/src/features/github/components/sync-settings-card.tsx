"use client";

import { ArrowsClockwise, Spinner, Warning, X } from "@phosphor-icons/react";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/typography";

import { GitHubPermissionErrorAlert } from "./github-permission-error-alert";

interface SyncSettingsCardProps {
  autoSyncEnabled: boolean;
  lastSyncAt?: number;
  isSyncing: boolean;
  isSettingUp?: boolean;
  isAdmin: boolean;
  error?: { code: string; message: string } | null;
  onToggleAutoSync: (enabled: boolean) => void;
  onSyncNow: () => void;
  onClearError?: () => void;
  onResyncGitHub?: () => void;
}

export function SyncSettingsCard({
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
  const renderError = () => {
    if (!error) {
      return null;
    }

    const isPermissionError = error.code === "GITHUB_PERMISSION_DENIED";
    const isLocalhostError = error.code === "LOCALHOST_NOT_SUPPORTED";

    if (isPermissionError && onResyncGitHub) {
      return (
        <GitHubPermissionErrorAlert
          message="The GitHub App is missing the required webhook permissions."
          onDismiss={onClearError}
          onResync={onResyncGitHub}
          title="Auto-sync setup failed"
        />
      );
    }

    return (
      <Alert className="mb-4" variant="destructive">
        <Warning className="h-4 w-4" />
        <AlertTitle>Auto-sync setup failed</AlertTitle>
        <AlertDescription>
          <p>{error.message}</p>
          {isLocalhostError ? (
            <p className="mt-2 text-muted-foreground">
              Try again in a deployed environment or use a tunneling service
              like ngrok for local development.
            </p>
          ) : null}
        </AlertDescription>
        {onClearError ? (
          <AlertAction>
            <Button
              className="h-6 w-6"
              onClick={onClearError}
              size="icon"
              variant="ghost"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </AlertAction>
        ) : null}
      </Alert>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowsClockwise className="h-5 w-5" />
          Release Sync
        </CardTitle>
        <CardDescription>
          Configure how releases are synced from GitHub
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderError()}

        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Label htmlFor="auto-sync">Auto-sync releases</Label>
            <Text className="text-muted-foreground text-sm">
              Automatically import new GitHub releases to your changelog
            </Text>
          </div>
          <div className="flex items-center gap-2">
            {isSettingUp ? (
              <Spinner className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : null}
            <Switch
              checked={autoSyncEnabled}
              disabled={!isAdmin || isSettingUp}
              id="auto-sync"
              onCheckedChange={onToggleAutoSync}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isAdmin ? (
            <Button disabled={isSyncing} onClick={onSyncNow} variant="outline">
              {isSyncing ? (
                <Spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowsClockwise className="mr-2 h-4 w-4" />
              )}
              Sync Now
            </Button>
          ) : null}
          {lastSyncAt ? (
            <Text className="text-muted-foreground text-sm">
              Last synced: {new Date(lastSyncAt).toLocaleString()}
            </Text>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
