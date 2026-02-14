"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface VersionPickerProps {
  organizationId: Id<"organizations">;
  /** The release being edited — excluded from "latest" computation */
  excludeReleaseId?: Id<"releases">;
  value: string;
  onChange: (version: string) => void;
  disabled?: boolean;
  className?: string;
}

export function VersionPicker({
  organizationId,
  excludeReleaseId,
  value,
  onChange,
  disabled,
  className,
}: VersionPickerProps) {
  const versionSuggestions = useQuery(api.releases.getNextVersion, {
    organizationId,
    excludeReleaseId,
  });

  const isAutoVersioning = versionSuggestions?.autoVersioning !== false;
  const hasAppliedDefault = useRef(false);

  // Auto-apply the default increment version for new releases
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

  const patchVersion = versionSuggestions?.patch;
  const minorVersion = versionSuggestions?.minor;
  const majorVersion = versionSuggestions?.major;

  const hasSuggestions = patchVersion || minorVersion || majorVersion;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center gap-2">
        <Input
          className="h-7 w-28 text-xs"
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="v1.0.0"
          readOnly={isAutoVersioning}
          title={
            isAutoVersioning
              ? "Version is managed automatically. Use the buttons below or disable auto-versioning in settings."
              : undefined
          }
          value={value}
        />
        {versionSuggestions?.current && (
          <Badge className="text-[10px]" variant="outline">
            latest: {versionSuggestions.current}
          </Badge>
        )}
      </div>
      {hasSuggestions && !disabled && (
        <div className="flex items-center gap-1">
          {patchVersion && (
            <Button
              className="h-5 px-1.5 text-[10px]"
              onClick={() => onChange(patchVersion)}
              size="sm"
              type="button"
              variant={value === patchVersion ? "default" : "ghost"}
            >
              Patch {patchVersion}
            </Button>
          )}
          {minorVersion && (
            <Button
              className="h-5 px-1.5 text-[10px]"
              onClick={() => onChange(minorVersion)}
              size="sm"
              type="button"
              variant={value === minorVersion ? "default" : "ghost"}
            >
              Minor {minorVersion}
            </Button>
          )}
          {majorVersion && (
            <Button
              className="h-5 px-1.5 text-[10px]"
              onClick={() => onChange(majorVersion)}
              size="sm"
              type="button"
              variant={value === majorVersion ? "default" : "ghost"}
            >
              Major {majorVersion}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
