"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { cn } from "@/lib/utils";
import type { VersionSuggestions } from "./version-suggestions";

const AUTO_VERSION_HINT =
  "Reflet picks the version. Use the buttons below, or turn off auto-versioning in settings.";

interface VersionPickerProps {
  className?: string;
  disabled?: boolean;
  onChange: (version: string) => void;
  value: string;
  versionSuggestions: VersionSuggestions;
}

export function VersionPicker({
  versionSuggestions,
  value,
  onChange,
  disabled,
  className,
}: VersionPickerProps) {
  const isAutoVersioning = versionSuggestions?.autoVersioning !== false;

  const increments = [
    { label: "Patch", version: versionSuggestions?.patch },
    { label: "Minor", version: versionSuggestions?.minor },
    { label: "Major", version: versionSuggestions?.major },
  ].filter(
    (increment): increment is { label: string; version: string } =>
      typeof increment.version === "string" && increment.version.length > 0
  );

  const versionInput = (
    <Input
      aria-label="Release version"
      className="w-28 tabular-nums"
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder="v1.0.0"
      readOnly={isAutoVersioning}
      size="xs"
      value={value}
    />
  );

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center gap-2">
        {isAutoVersioning ? (
          <Tooltip>
            <TooltipTrigger render={versionInput} />
            <TooltipContent>{AUTO_VERSION_HINT}</TooltipContent>
          </Tooltip>
        ) : (
          versionInput
        )}
        {versionSuggestions?.current && (
          <Badge className="tabular-nums" size="sm" variant="outline">
            Latest: {versionSuggestions.current}
          </Badge>
        )}
      </div>
      {increments.length > 0 && !disabled && (
        <div className="flex items-center gap-1">
          {increments.map((increment) => (
            <Button
              aria-pressed={value === increment.version}
              className="tabular-nums"
              key={increment.label}
              onClick={() => onChange(increment.version)}
              size="xs"
              tone={value === increment.version ? "primary" : "neutral"}
              type="button"
              variant={value === increment.version ? "solid" : "ghost"}
            >
              {increment.label} {increment.version}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
