"use client";

import { GitBranch } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface AutomationSectionProps {
  autoPublishImported?: boolean;
  isAdmin: boolean;
  isSaving: boolean;
  onUpdate: (updates: Record<string, unknown>) => Promise<void>;
  pushToGithubOnPublish?: boolean;
  targetBranch?: string;
}

export const AutomationSection = ({
  autoPublishImported,
  isAdmin,
  isSaving,
  onUpdate,
  pushToGithubOnPublish,
  targetBranch,
}: AutomationSectionProps) => (
  <div className="space-y-4 rounded-lg border p-4">
    <p className="font-medium text-sm">Automation</p>

    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <div>
            <Label className="text-sm">Target branch</Label>
            <p className="text-muted-foreground text-xs">
              Branch to track for releases and code changes
            </p>
          </div>
        </div>
        <Input
          className="h-8 w-32 text-xs"
          defaultValue={targetBranch ?? "main"}
          disabled={!isAdmin || isSaving}
          onBlur={(e) => onUpdate({ targetBranch: e.target.value })}
          placeholder="main"
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm">Push to GitHub on publish</Label>
          <p className="text-muted-foreground text-xs">
            Create a GitHub Release when you publish in Reflet
          </p>
        </div>
        <Switch
          checked={pushToGithubOnPublish === true}
          disabled={!isAdmin || isSaving}
          onCheckedChange={(checked) =>
            onUpdate({ pushToGithubOnPublish: checked })
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm">Auto-publish imported</Label>
          <p className="text-muted-foreground text-xs">
            Publish releases automatically when imported from GitHub
          </p>
        </div>
        <Switch
          checked={autoPublishImported === true}
          disabled={!isAdmin || isSaving}
          onCheckedChange={(checked) =>
            onUpdate({ autoPublishImported: checked })
          }
        />
      </div>
    </div>
  </div>
);
