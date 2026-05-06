"use client";

import { IconHierarchy3, IconList } from "@tabler/icons-react";
import { useState } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { ChainStatus } from "@/features/autopilot/components/chain-status";
import { ChainTechTree } from "@/features/autopilot/components/chain-tech-tree";

type ChainView = "tree" | "list";

export default function AutopilotChainPage() {
  const { organizationId, isAdmin } = useAutopilotContext();
  const [view, setView] = useState<ChainView>("tree");

  if (!isAdmin) {
    return (
      <div className="text-muted-foreground text-sm">
        Admin-only view. The document chain is the underlying mechanism that
        drives the autopilot — it stays under the hood for non-admin users.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ToggleGroup size="sm" variant="outline">
          <ToggleGroupItem
            aria-label="Tech tree view"
            onPressedChange={(p) => p && setView("tree")}
            pressed={view === "tree"}
            value="tree"
          >
            <IconHierarchy3 className="size-3.5" />
            Tree
          </ToggleGroupItem>
          <ToggleGroupItem
            aria-label="List view"
            onPressedChange={(p) => p && setView("list")}
            pressed={view === "list"}
            value="list"
          >
            <IconList className="size-3.5" />
            List
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {view === "tree" ? (
        <ChainTechTree organizationId={organizationId} />
      ) : (
        <ChainStatus organizationId={organizationId} />
      )}
    </div>
  );
}
