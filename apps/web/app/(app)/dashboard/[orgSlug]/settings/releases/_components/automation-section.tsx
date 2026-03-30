"use client";

import { GitBranch, Spinner } from "@phosphor-icons/react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface BranchInfo {
  isProtected: boolean;
  name: string;
}

interface AutomationSectionProps {
  autoPublishImported?: boolean;
  branches: BranchInfo[];
  isAdmin: boolean;
  isLoadingBranches: boolean;
  isSaving: boolean;
  onUpdate: (updates: Record<string, unknown>) => Promise<void>;
  pushToGithubOnPublish?: boolean;
  targetBranch?: string;
}

export const AutomationSection = ({
  autoPublishImported,
  branches,
  isAdmin,
  isLoadingBranches,
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
          <Label className="text-sm">Target branch</Label>
        </div>
        {isLoadingBranches ? (
          <div className="flex h-8 w-40 items-center gap-1.5 text-muted-foreground text-xs">
            <Spinner className="h-3 w-3 animate-spin" />
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
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.name} value={branch.name}>
                  {branch.name}
                  {branch.isProtected ? " 🔒" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-sm">Create GitHub Release on publish</Label>
        <Switch
          checked={pushToGithubOnPublish === true}
          disabled={!isAdmin || isSaving}
          onCheckedChange={(checked) =>
            onUpdate({ pushToGithubOnPublish: checked })
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-sm">Auto-publish imported releases</Label>
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
