"use client";

import { ArrowsClockwise, GithubLogo } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Muted } from "@/components/ui/typography";

const SYNC_DIRECTION_LABELS = {
  github_first: "GitHub → Reflet",
  reflet_first: "Reflet → GitHub",
  bidirectional: "Bidirectional",
  none: "Manual only",
} as const;

export type SyncDirectionKey = keyof typeof SYNC_DIRECTION_LABELS;

export { SYNC_DIRECTION_LABELS };

interface SyncDirectionSectionProps {
  currentDirection?: string;
  isAdmin: boolean;
  isConnected: boolean;
  isSaving: boolean;
  onUpdate: (updates: Record<string, unknown>) => Promise<void>;
}

export const SyncDirectionSection = ({
  currentDirection,
  isAdmin,
  isConnected,
  isSaving,
  onUpdate,
}: SyncDirectionSectionProps) => (
  <div className="space-y-4 rounded-lg border p-4">
    <div className="flex items-center gap-3">
      <ArrowsClockwise className="h-5 w-5 text-muted-foreground" />
      <div>
        <p className="font-medium text-sm">Sync Direction</p>
        <Muted className="text-xs">
          How releases flow between GitHub and Reflet
        </Muted>
      </div>
    </div>

    {isConnected ? (
      <div className="grid grid-cols-2 gap-2">
        {(
          Object.entries(SYNC_DIRECTION_LABELS) as [SyncDirectionKey, string][]
        ).map(([key, label]) => (
          <Button
            className="justify-start"
            disabled={!isAdmin || isSaving}
            key={key}
            onClick={() => onUpdate({ syncDirection: key })}
            size="sm"
            variant={currentDirection === key ? "default" : "outline"}
          >
            {label}
          </Button>
        ))}
      </div>
    ) : (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <GithubLogo className="h-4 w-4" />
        <span>Connect GitHub to configure sync</span>
      </div>
    )}
  </div>
);
