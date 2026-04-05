"use client";

import {
  IconBrain,
  IconCode,
  IconCoin,
  IconHeadset,
  IconRocket,
  IconUsers,
} from "@tabler/icons-react";
import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

const AGENT_CONFIG: Record<
  string,
  {
    label: string;
    icon: ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
  }
> = {
  pm: {
    label: "PM",
    icon: IconUsers,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  cto: {
    label: "CTO",
    icon: IconBrain,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  dev: {
    label: "Dev",
    icon: IconCode,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  growth: {
    label: "Growth",
    icon: IconRocket,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  support: {
    label: "Support",
    icon: IconHeadset,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
  sales: {
    label: "Sales",
    icon: IconCoin,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  orchestrator: {
    label: "CEO",
    icon: IconUsers,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
  },
  system: {
    label: "System",
    icon: IconCode,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
} as const;

export function AgentIdentity({
  agent,
  size = "sm",
  showLabel = true,
  className,
}: {
  agent: string;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}) {
  const config = AGENT_CONFIG[agent] ?? AGENT_CONFIG.system;
  const Icon = config.icon;
  const iconSize = size === "sm" ? "size-3.5" : "size-4";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-full",
          config.bgColor,
          size === "sm" ? "size-5" : "size-6"
        )}
      >
        <Icon className={cn(iconSize, config.color)} />
      </div>
      {showLabel && (
        <span
          className={cn(
            "font-medium",
            config.color,
            size === "sm" ? "text-xs" : "text-sm"
          )}
        >
          {config.label}
        </span>
      )}
    </div>
  );
}
