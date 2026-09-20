"use client";

import { Input } from "@ctrl-ui/react/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import { Switch } from "@ctrl-ui/react/ui/switch";
import { Tag } from "@phosphor-icons/react";
import { Label } from "@/components/ui/label";
import type { ChangelogSettingsUpdate, VersionIncrement } from "./types";

const INCREMENT_OPTIONS: { label: string; value: VersionIncrement }[] = [
  { label: "Patch", value: "patch" },
  { label: "Minor", value: "minor" },
  { label: "Major", value: "major" },
];

interface VersioningSectionProps {
  autoVersioning?: boolean;
  isAdmin: boolean;
  isSaving: boolean;
  onUpdate: ChangelogSettingsUpdate;
  versionIncrement?: string;
  versionPrefix?: string;
}

export const VersioningSection = ({
  autoVersioning,
  isAdmin,
  isSaving,
  onUpdate,
  versionIncrement,
  versionPrefix,
}: VersioningSectionProps) => (
  <div className="space-y-4 rounded-lg border p-4">
    <div className="flex items-center gap-3">
      <Tag className="h-5 w-5 text-muted-foreground" />
      <p className="font-medium text-sm">Versioning</p>
    </div>

    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm">Auto-versioning</Label>
        <Switch
          checked={autoVersioning !== false}
          disabled={!isAdmin || isSaving}
          onCheckedChange={(checked) => onUpdate({ autoVersioning: checked })}
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label className="text-xs" htmlFor="version-prefix">
            Version prefix
          </Label>
          <Input
            className="mt-1 h-8"
            defaultValue={versionPrefix ?? "v"}
            disabled={!isAdmin || isSaving}
            id="version-prefix"
            onBlur={(e) => onUpdate({ versionPrefix: e.target.value })}
            placeholder="v"
          />
        </div>
        <div className="flex-1">
          <Label className="text-xs">Default increment</Label>
          <Select
            defaultValue={versionIncrement ?? "patch"}
            disabled={!isAdmin || isSaving}
            onValueChange={(val) => {
              const option = INCREMENT_OPTIONS.find((o) => o.value === val);
              if (option) {
                onUpdate({ versionIncrement: option.value });
              }
            }}
          >
            <SelectTrigger aria-label="Default increment" className="mt-1 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INCREMENT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  </div>
);
