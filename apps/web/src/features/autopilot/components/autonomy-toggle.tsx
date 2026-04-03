"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconRobot,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAutopilotContext } from "./autopilot-context";

const MODES = [
  {
    value: "supervised",
    label: "Supervised",
    icon: IconPlayerPlay,
    description: "Asks before acting",
    activeClass: "border-green-500/50 bg-green-500/10 text-green-600",
    dotClass: "bg-green-500",
  },
  {
    value: "full_auto",
    label: "Full Auto",
    icon: IconRobot,
    description: "Autonomous with delay",
    activeClass: "border-orange-500/50 bg-orange-500/10 text-orange-600",
    dotClass: "bg-orange-500",
  },
  {
    value: "stopped",
    label: "Stopped",
    icon: IconPlayerPause,
    description: "All agents paused",
    activeClass: "border-muted-foreground/30 bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground/50",
  },
] as const;

type AutonomyModeValue = (typeof MODES)[number]["value"];

export function AutonomyToggle() {
  const { organizationId, isAdmin } = useAutopilotContext();
  const config = useQuery(api.autopilot.queries.getConfig, {
    organizationId,
  });
  const setMode = useMutation(api.autopilot.mutations.setAutonomyMode);

  const currentMode: AutonomyModeValue =
    (config?.autonomyMode as AutonomyModeValue) ?? "supervised";

  const handleModeChange = async (mode: AutonomyModeValue) => {
    if (mode === currentMode) {
      return;
    }

    try {
      await setMode({ organizationId, mode });
      toast.success(`Autonomy mode set to ${mode.replace("_", " ")}`);
    } catch {
      toast.error("Failed to change autonomy mode");
    }
  };

  if (!config) {
    return null;
  }

  return (
    <div className="flex gap-2">
      {MODES.map((mode) => {
        const isActive = currentMode === mode.value;

        return (
          <Button
            className={cn(
              "h-auto flex-col gap-1 px-4 py-2",
              isActive && mode.activeClass
            )}
            disabled={!isAdmin}
            key={mode.value}
            onClick={() => handleModeChange(mode.value)}
            size="sm"
            variant={isActive ? "outline" : "ghost"}
          >
            <div className="flex items-center gap-1.5">
              <mode.icon className="size-3.5" />
              <span className="font-medium text-xs">{mode.label}</span>
            </div>
            <span className="text-[10px] opacity-70">{mode.description}</span>
          </Button>
        );
      })}
    </div>
  );
}
