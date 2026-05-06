"use client";

import {
  IconBrain,
  IconCode,
  IconCoin,
  IconCrown,
  IconHeadset,
  IconRocket,
  IconUsers,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import Link from "next/link";

import {
  type AgentStatus,
  getAgentStatus,
} from "@/features/autopilot/components/agent-card";
import { cn } from "@/lib/utils";

// ============================================
// AGENT DEFINITIONS
// ============================================

export const AGENT_META = {
  orchestrator: {
    label: "CEO",
    icon: IconCrown,
    description: "Strategy & coordination",
  },
  pm: { label: "PM", icon: IconUsers, description: "Product management" },
  cto: { label: "CTO", icon: IconBrain, description: "Architecture & specs" },
  dev: { label: "Dev", icon: IconCode, description: "Code & shipping" },
  growth: {
    label: "Growth",
    icon: IconRocket,
    description: "Marketing & distribution",
  },
  support: {
    label: "Support",
    icon: IconHeadset,
    description: "User conversations",
  },
  sales: { label: "Sales", icon: IconCoin, description: "Pipeline & leads" },
} as const;

export type GridAgentId = keyof typeof AGENT_META;

export const GRID_AGENT_IDS: readonly GridAgentId[] = [
  "orchestrator",
  "pm",
  "cto",
  "dev",
  "growth",
  "support",
  "sales",
] as const;

// ============================================
// STATUS CONSTANTS
// ============================================

const STATUS_LABELS: Record<AgentStatus, string> = {
  active: "Working",
  blocked: "Blocked",
  error: "Error",
  idle: "Idle",
  disabled: "Off",
};

const STATUS_LABEL_COLORS: Record<AgentStatus, string> = {
  active: "text-emerald-500 dark:text-emerald-400",
  blocked: "text-amber-500 dark:text-amber-400",
  error: "text-red-500 dark:text-red-400",
  idle: "text-muted-foreground/40",
  disabled: "text-muted-foreground/20",
};

export { STATUS_LABEL_COLORS, STATUS_LABELS };

// ============================================
// MARKER BADGE STYLES per status
// ============================================

export const MARKER_STYLES: Record<AgentStatus, string> = {
  active:
    "bg-emerald-500 text-white border-emerald-600 shadow-[0_4px_12px_rgba(16,185,129,0.4)]",
  blocked:
    "bg-amber-500 text-white border-amber-600 shadow-[0_4px_12px_rgba(245,158,11,0.3)]",
  error:
    "bg-red-500 text-white border-red-600 shadow-[0_4px_12px_rgba(239,68,68,0.3)]",
  idle: "bg-card text-foreground/70 border-border shadow-sm",
  disabled: "bg-muted text-muted-foreground/40 border-border/50 shadow-none",
};

const PIN_COLORS: Record<AgentStatus, string> = {
  active: "bg-emerald-400/80",
  blocked: "bg-amber-400/80",
  error: "bg-red-400/80",
  idle: "bg-border",
  disabled: "bg-border/40",
};

// ============================================
// STATUS TEXTURE (CSS pattern overlay)
// ============================================

function MarkerTexture({ status }: { status: AgentStatus }) {
  if (status === "idle" || status === "disabled") {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-lg opacity-20",
        status === "active" &&
          "bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.3)_4px,rgba(255,255,255,0.3)_8px)]",
        status === "blocked" &&
          "bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(255,255,255,0.2)_6px,rgba(255,255,255,0.2)_12px),repeating-linear-gradient(-45deg,transparent,transparent_6px,rgba(255,255,255,0.2)_6px,rgba(255,255,255,0.2)_12px)]",
        status === "error" &&
          "bg-[radial-gradient(circle_2px_at_4px_4px,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[size:8px_8px]"
      )}
    />
  );
}

// ============================================
// 3D ISOMETRIC AGENT MARKER
// ============================================

export function AgentGridCard({
  agentId,
  enabled,
  lastActivity,
  taskCount,
  currentTaskTitle,
  blocked,
  baseUrl,
  index,
  x,
  y,
}: {
  agentId: GridAgentId;
  enabled: boolean;
  lastActivity: { level: string; createdAt: number } | undefined;
  taskCount: number;
  currentTaskTitle?: string;
  blocked: boolean;
  baseUrl: string;
  index: number;
  x: number;
  y: number;
}) {
  const meta = AGENT_META[agentId];
  const status = getAgentStatus(enabled, lastActivity, blocked);
  const isActive = status === "active";
  const isCeo = agentId === "orchestrator";

  return (
    <div
      className="absolute"
      style={{
        left: x,
        top: y,
        transform: "translateZ(30px) rotateX(-60deg) rotateZ(45deg)",
        transformOrigin: "bottom center",
      }}
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex flex-col items-center",
          isCeo && "scale-110",
          status === "disabled" && "opacity-50 grayscale-[0.5]"
        )}
        initial={{ opacity: 0, y: -16 }}
        transition={{
          duration: 0.5,
          delay: index * 0.08,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        <Link
          className="group flex flex-col items-center transition-transform duration-200 hover:scale-110"
          href={`${baseUrl}/agents/${agentId}`}
        >
          {/* Agent badge */}
          <div
            className={cn(
              "relative flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 font-bold text-xs",
              MARKER_STYLES[status]
            )}
          >
            <MarkerTexture status={status} />
            {isActive && (
              <motion.div
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                className="pointer-events-none absolute -inset-1 rounded-xl bg-emerald-400/20 blur-md"
                transition={{
                  duration: 2.5,
                  repeat: Number.POSITIVE_INFINITY,
                }}
              />
            )}
            <meta.icon className="relative" size={13} />
            <span className="relative">{meta.label}</span>
            {taskCount > 0 && (
              <span className="relative ml-0.5 flex size-4 items-center justify-center rounded-full bg-white/25 font-mono text-[9px]">
                {taskCount}
              </span>
            )}
          </div>

          {/* Current task tooltip */}
          {currentTaskTitle && isActive && (
            <div className="mt-1 max-w-[140px] truncate rounded bg-card/90 px-2 py-0.5 text-[9px] text-foreground/50 shadow-sm">
              {currentTaskTitle}
            </div>
          )}

          {/* Pin stem */}
          <div
            className={cn("mt-1 h-7 w-0.5 rounded-full", PIN_COLORS[status])}
          />

          {/* Ground shadow */}
          <div className="h-1.5 w-4 rounded-full bg-black/15 blur-[2px]" />
        </Link>
      </motion.div>
    </div>
  );
}
