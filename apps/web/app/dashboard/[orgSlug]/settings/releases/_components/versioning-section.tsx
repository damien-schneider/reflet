"use client";

import { Tag } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Muted } from "@/components/ui/typography";

interface VersioningSectionProps {
  autoVersioning?: boolean;
  isAdmin: boolean;
  isSaving: boolean;
  onUpdate: (updates: Record<string, unknown>) => Promise<void>;
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
      <div>
        <p className="font-medium text-sm">Versioning</p>
        <Muted className="text-xs">
          Auto-versioning and naming preferences
        </Muted>
      </div>
    </div>

    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm">Auto-versioning</Label>
          <p className="text-muted-foreground text-xs">
            When enabled, versions are set automatically using the default
            increment. Disable to allow free-form version input.
          </p>
        </div>
        <Switch
          checked={autoVersioning !== false}
          disabled={!isAdmin || isSaving}
          onCheckedChange={(checked) => onUpdate({ autoVersioning: checked })}
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label className="text-xs">Version prefix</Label>
          <Input
            className="mt-1 h-8"
            defaultValue={versionPrefix ?? "v"}
            disabled={!isAdmin || isSaving}
            onBlur={(e) => onUpdate({ versionPrefix: e.target.value })}
            placeholder="v"
          />
        </div>
        <div className="flex-1">
          <Label className="text-xs">Default increment</Label>
          <Select
            defaultValue={versionIncrement ?? "patch"}
            disabled={!isAdmin || isSaving}
            onValueChange={(val) => onUpdate({ versionIncrement: val })}
          >
            <SelectTrigger className="mt-1 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="patch">Patch</SelectItem>
              <SelectItem value="minor">Minor</SelectItem>
              <SelectItem value="major">Major</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  </div>
);
