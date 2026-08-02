"use client";

import { GitBranch } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import {
  SYNC_DIRECTION_LABELS,
  type SyncDirectionKey,
} from "./sync-direction-section";

const isSyncDirectionKey = (value: unknown): value is SyncDirectionKey =>
  typeof value === "string" && value in SYNC_DIRECTION_LABELS;

interface ChangelogSettings {
  autoPublishImported?: boolean;
  autoVersioning?: boolean;
  pushToGithubOnPublish?: boolean;
  syncDirection?: string;
  targetBranch?: string;
}

interface CurrentConfigSectionProps {
  settings: ChangelogSettings;
}

export const CurrentConfigSection = ({
  settings,
}: CurrentConfigSectionProps) => (
  <div className="rounded-lg border bg-muted/30 p-4">
    <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
      Current Configuration
    </p>
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline">
        {isSyncDirectionKey(settings.syncDirection)
          ? SYNC_DIRECTION_LABELS[settings.syncDirection]
          : (settings.syncDirection ?? "Not configured")}
      </Badge>
      {settings.pushToGithubOnPublish && (
        <Badge variant="secondary">Push to GitHub</Badge>
      )}
      {settings.autoPublishImported && (
        <Badge variant="secondary">Auto-publish imports</Badge>
      )}
      {settings.autoVersioning !== false && (
        <Badge variant="secondary">Auto-versioning</Badge>
      )}
      {settings.targetBranch && (
        <Badge variant="outline">
          <GitBranch className="mr-1 h-3 w-3" />
          {settings.targetBranch}
        </Badge>
      )}
    </div>
  </div>
);
