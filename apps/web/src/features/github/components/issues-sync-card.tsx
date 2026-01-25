"use client";

import { ArrowsClockwise, Bug, Spinner } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
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

interface IssuesSyncCardProps {
  isEnabled: boolean;
  autoSync: boolean;
  lastSyncAt?: number;
  lastSyncStatus?: string;
  syncedIssuesCount: number;
  importedCount: number;
  mappingsCount: number;
  isSyncing: boolean;
  isAdmin: boolean;
  onToggleSync: (enabled: boolean, autoSync: boolean) => void;
  onSyncNow: () => void;
}

export function IssuesSyncCard({
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
}: IssuesSyncCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Issue Sync
        </CardTitle>
        <CardDescription>
          Sync GitHub issues to your feedback boards based on label mappings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="issues-sync">Enable issue sync</Label>
            <Text className="text-muted-foreground text-sm">
              Sync GitHub issues to Reflet based on label mappings
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
                  variant="outline"
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
                  <Badge variant="destructive">Error</Badge>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
