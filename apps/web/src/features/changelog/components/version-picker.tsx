"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const AUTO_VERSION_HINT =
  "Version is managed automatically. Use the buttons below or disable auto-versioning in settings.";

interface VersionPickerProps {
  className?: string;
  disabled?: boolean;
  /** The release being edited — excluded from "latest" computation */
  excludeReleaseId?: Id<"releases">;
  onChange: (version: string) => void;
  organizationId: Id<"organizations">;
  value: string;
}

export function VersionPicker({
  organizationId,
  excludeReleaseId,
  value,
  onChange,
  disabled,
  className,
}: VersionPickerProps) {
  const versionSuggestions = useQuery(api.changelog.queries.getNextVersion, {
    excludeReleaseId,
    organizationId,
  });

  const isAutoVersioning = versionSuggestions?.autoVersioning !== false;
  const hasAppliedDefault = useRef(false);

  useEffect(() => {
    if (hasAppliedDefault.current || value || !isAutoVersioning) {
      return;
    }
    if (!versionSuggestions) {
      return;
    }

    const defaultVersion =
      versionSuggestions[versionSuggestions.defaultIncrement ?? "patch"];
    if (defaultVersion) {
      hasAppliedDefault.current = true;
      onChange(defaultVersion);
    }
  }, [versionSuggestions, value, isAutoVersioning, onChange]);

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
      className="h-7 w-28 text-xs tabular-nums"
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder="v1.0.0"
      readOnly={isAutoVersioning}
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
          <Badge className="text-caption tabular-nums" variant="outline">
            latest: {versionSuggestions.current}
          </Badge>
        )}
      </div>
      {increments.length > 0 && !disabled && (
        <div className="flex items-center gap-1">
          {increments.map((increment) => (
            <Button
              className="h-5 px-1.5 text-caption tabular-nums"
              key={increment.label}
              onClick={() => onChange(increment.version)}
              size="sm"
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
