"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Switch } from "@ctrl-ui/react/ui/switch";
import { GitBranch, LockSimple } from "@phosphor-icons/react";
import { Label } from "@/components/ui/label";
import type { ChangelogSettingsUpdate } from "./types";

interface BranchInfo {
  isProtected: boolean;
  name: string;
}

interface AutomationSectionProps {
  autoPublishImported?: boolean;
  autoSyncReleases: boolean;
  branches: BranchInfo[];
  isAdmin: boolean;
  isLoadingBranches: boolean;
  isSaving: boolean;
  onToggleAutoSync: (enabled: boolean) => Promise<void>;
  onUpdate: ChangelogSettingsUpdate;
  pushToGithubOnPublish?: boolean;
  targetBranch?: string;
}

export const AutomationSection = ({
  autoPublishImported,
  autoSyncReleases,
  branches,
  isAdmin,
  isLoadingBranches,
  isSaving,
  onToggleAutoSync,
  onUpdate,
  pushToGithubOnPublish,
  targetBranch,
}: AutomationSectionProps) => (
  <div className="space-y-4 rounded-lg border p-4">
    <h3 className="font-medium text-sm">Automation</h3>

    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch aria-hidden className="size-4 text-muted-foreground" />
          <Label htmlFor="settings-target-branch">Target branch</Label>
        </div>
        {isLoadingBranches ? (
          <div
            aria-live="polite"
            className="flex h-8 w-40 items-center gap-1.5 text-muted-foreground text-xs"
          >
            <Spinner size="xs" />
            Loading branches…
          </div>
        ) : (
          <Select
            disabled={!isAdmin || isSaving}
            onValueChange={(val) => {
              if (val) {
                onUpdate({ targetBranch: val });
              }
            }}
            value={targetBranch ?? "main"}
          >
            <SelectTrigger
              className="w-40"
              id="settings-target-branch"
              size="sm"
            >
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.name} value={branch.name}>
                  {branch.name}
                  {branch.isProtected && (
                    <LockSimple
                      aria-label="Protected"
                      className="size-3.5 text-muted-foreground"
                    />
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="settings-push-to-github">
          Create GitHub Release on publish
        </Label>
        <Switch
          checked={pushToGithubOnPublish === true}
          disabled={!isAdmin || isSaving}
          id="settings-push-to-github"
          onCheckedChange={(checked) =>
            onUpdate({ pushToGithubOnPublish: checked })
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="settings-auto-sync">
          Import releases published on GitHub
        </Label>
        <Switch
          checked={autoSyncReleases}
          disabled={!isAdmin || isSaving}
          id="settings-auto-sync"
          onCheckedChange={onToggleAutoSync}
        />
      </div>

      {autoSyncReleases && (
        <div className="flex items-center justify-between border-l pl-4">
          <Label htmlFor="settings-auto-publish">
            Publish imported releases right away
          </Label>
          <Switch
            checked={autoPublishImported !== false}
            disabled={!isAdmin || isSaving}
            id="settings-auto-publish"
            onCheckedChange={(checked) =>
              onUpdate({ autoPublishImported: checked })
            }
          />
        </div>
      )}
    </div>
  </div>
);
