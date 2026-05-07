"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconRobot,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAutopilotContext } from "./autopilot-context";

const MODES = [
  {
    value: "supervised",
    label: "Supervised",
    icon: IconPlayerPlay,
    description: "Asks before acting",
    activeClass:
      "bg-green-500/10 text-green-600 dark:text-green-400 shadow-[inset_0_0_0_1px_rgba(34,197,94,0.3)]",
    dotClass: "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]",
  },
  {
    value: "full_auto",
    label: "Full Auto",
    icon: IconRobot,
    description: "Autonomous with delay",
    activeClass:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.3)]",
    dotClass: "bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)]",
  },
  {
    value: "stopped",
    label: "Off",
    icon: IconPlayerPause,
    description: "All agents stopped",
    activeClass:
      "bg-muted text-muted-foreground shadow-[inset_0_0_0_1px_rgba(128,128,128,0.2)]",
    dotClass: "bg-muted-foreground/50",
  },
] as const;

type AutonomyModeValue = (typeof MODES)[number]["value"];

export function AutonomyToggle() {
  const { organizationId, isAdmin } = useAutopilotContext();
  const config = useQuery(api.autopilot.queries.config.getConfig, {
    organizationId,
  });
  const setMode = useMutation(api.autopilot.mutations.config.setAutonomyMode);

  const currentMode =
    MODES.find((mode) => mode.value === config?.autonomyMode)?.value ??
    "supervised";

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
    <div className="flex items-center rounded-lg border border-border/50 bg-muted/30 p-0.5">
      {MODES.map((mode) => {
        const isActive = currentMode === mode.value;

        return (
          <Tooltip key={mode.value}>
            <TooltipTrigger
              aria-label={`${mode.label}: ${mode.description}`}
              className={cn(
                "relative flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors duration-200",
                "text-muted-foreground hover:text-foreground",
                "disabled:pointer-events-none disabled:opacity-50",
                isActive && mode.activeClass
              )}
              disabled={!isAdmin}
              onClick={() => handleModeChange(mode.value)}
            >
              {isActive && (
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    mode.dotClass
                  )}
                />
              )}
              <mode.icon className="size-3.5 shrink-0" />
              <span className="font-medium">{mode.label}</span>
            </TooltipTrigger>
            <TooltipContent>{mode.description}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
