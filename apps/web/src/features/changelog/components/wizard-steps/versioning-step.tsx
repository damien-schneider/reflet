"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { WizardConfig } from "../release-setup-wizard";

interface VersioningStepProps {
  config: WizardConfig;
  onChange: (partial: Partial<WizardConfig>) => void;
}

const INCREMENT_OPTIONS = [
  { id: "patch" as const, label: "Patch", example: "v1.0.0 → v1.0.1" },
  { id: "minor" as const, label: "Minor", example: "v1.0.0 → v1.1.0" },
  { id: "major" as const, label: "Major", example: "v1.0.0 → v2.0.0" },
] as const;

export function VersioningStep({ config, onChange }: VersioningStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Configure how versions are managed:
      </p>

      <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <div>
          <Label className="text-sm" htmlFor="auto-version">
            Auto-suggest version
          </Label>
          <p className="text-muted-foreground text-xs">
            Suggest the next SemVer version based on your latest release
          </p>
        </div>
        <Switch
          checked={config.autoVersioning}
          id="auto-version"
          onCheckedChange={(checked) => onChange({ autoVersioning: checked })}
        />
      </div>

      {config.autoVersioning && (
        <>
          <div className="space-y-2">
            <Label className="text-sm" htmlFor="version-prefix">
              Version prefix
            </Label>
            <Input
              className="h-8 w-20 text-sm"
              id="version-prefix"
              onChange={(e) => onChange({ versionPrefix: e.target.value })}
              placeholder="v"
              value={config.versionPrefix}
            />
            <p className="text-muted-foreground text-xs">
              Set to &quot;v&quot; for v1.0.0 format, or leave empty for 1.0.0
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Default increment</Label>
            <div className="flex gap-2">
              {INCREMENT_OPTIONS.map((option) => (
                <button
                  className={cn(
                    "flex flex-col items-center rounded-lg border px-4 py-2 transition-colors",
                    config.versionIncrement === option.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                  key={option.id}
                  onClick={() => onChange({ versionIncrement: option.id })}
                  type="button"
                >
                  <span className="font-medium text-sm">{option.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {option.example}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
