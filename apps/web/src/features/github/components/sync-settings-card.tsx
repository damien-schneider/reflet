"use client";

import { ArrowsClockwise, Spinner } from "@phosphor-icons/react";

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

interface SyncSettingsCardProps {
  autoSyncEnabled: boolean;
  lastSyncAt?: number;
  isSyncing: boolean;
  isAdmin: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
  onSyncNow: () => void;
}

export function SyncSettingsCard({
  autoSyncEnabled,
  lastSyncAt,
  isSyncing,
  isAdmin,
  onToggleAutoSync,
  onSyncNow,
}: SyncSettingsCardProps) {
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
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="auto-sync">Auto-sync releases</Label>
            <Text className="text-muted-foreground text-sm">
              Automatically import new GitHub releases to your changelog
            </Text>
          </div>
          <Switch
            checked={autoSyncEnabled}
            disabled={!isAdmin}
            id="auto-sync"
            onCheckedChange={onToggleAutoSync}
          />
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
