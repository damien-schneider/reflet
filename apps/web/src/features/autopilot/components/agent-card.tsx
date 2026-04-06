"use client";

import {
  IconBrain,
  IconCode,
  IconCoin,
  IconHeadset,
  IconRocket,
  IconUsers,
} from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ============================================
// AGENT DEFINITIONS & HIERARCHY
// ============================================

export const AGENTS = [
  { id: "pm", label: "PM", icon: IconUsers, configField: "pmEnabled" },
  { id: "cto", label: "CTO", icon: IconBrain, configField: "ctoEnabled" },
  { id: "dev", label: "Dev", icon: IconCode, configField: "devEnabled" },
  {
    id: "growth",
    label: "Growth",
    icon: IconRocket,
    configField: "growthEnabled",
  },
  {
    id: "support",
    label: "Support",
    icon: IconHeadset,
    configField: "supportEnabled",
  },
  {
    id: "sales",
    label: "Sales",
    icon: IconCoin,
    configField: "salesEnabled",
  },
] as const;

/** PM's core pipeline agents */
export const CORE_PIPELINE = ["pm", "cto", "dev"] as const;

/** PM's extended team */
export const PM_TEAM = ["growth", "support"] as const;

/** Independent specialist agents */
export const SPECIALISTS = ["sales"] as const;

const ACTIVE_WINDOW = 5 * 60 * 1000;
const RECENT_WINDOW = 30 * 60 * 1000;

export type AgentStatus = "active" | "blocked" | "error" | "idle" | "disabled";

export function getAgentStatus(
  enabled: boolean,
  last: { level: string; createdAt: number } | undefined,
  blocked: boolean
): AgentStatus {
  if (!enabled) {
    return "disabled";
  }
  if (blocked) {
    return "blocked";
  }
  const timeSince = last ? Date.now() - last.createdAt : null;
  const hasError = last?.level === "error";
  const isRecent = timeSince !== null && timeSince < RECENT_WINDOW;
  const isActiveNow = timeSince !== null && timeSince < ACTIVE_WINDOW;

  if (hasError && isRecent) {
    return "error";
  }
  if (isActiveNow) {
    return "active";
  }
  return "idle";
}

const STATUS_META: Record<
  AgentStatus,
  { color: string; glow: string; label: string; ring: string }
> = {
  active: {
    color: "text-emerald-400",
    glow: "shadow-emerald-500/20",
    label: "Working",
    ring: "stroke-emerald-400",
  },
  blocked: {
    color: "text-amber-400",
    glow: "shadow-amber-500/20",
    label: "Blocked",
    ring: "stroke-amber-400",
  },
  error: {
    color: "text-red-400",
    glow: "shadow-red-500/20",
    label: "Error",
    ring: "stroke-red-400",
  },
  idle: {
    color: "text-muted-foreground/50",
    glow: "",
    label: "Idle",
    ring: "stroke-muted-foreground/20",
  },
  disabled: {
    color: "text-muted-foreground/30",
    glow: "",
    label: "Off",
    ring: "stroke-muted-foreground/10",
  },
};

// ============================================
// STATUS RING — animated SVG indicator
// ============================================

export function StatusRing({
  status,
  size = 32,
}: {
  status: AgentStatus;
  size?: number;
}) {
  const meta = STATUS_META[status];
  const r = (size - 4) / 2;
  const circumference = 2 * Math.PI * r;
  const isActive = status === "active";
  let fillRatio = 1;
  if (status === "disabled") {
    fillRatio = 0;
  } else if (status === "idle") {
    fillRatio = 0.25;
  }

  return (
    <svg
      aria-hidden="true"
      className="shrink-0 -rotate-90"
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
    >
      <circle
        className="stroke-muted-foreground/[0.06]"
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={r}
        strokeWidth={2}
      />
      <motion.circle
        animate={{
          strokeDashoffset: circumference - fillRatio * circumference,
          opacity: status === "disabled" ? 0.3 : 1,
        }}
        className={meta.ring}
        cx={size / 2}
        cy={size / 2}
        fill="none"
        initial={{ strokeDashoffset: circumference }}
        r={r}
        strokeDasharray={circumference}
        strokeLinecap="round"
        strokeWidth={2}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      {isActive && (
        <motion.circle
          animate={{ opacity: [0.6, 0.15, 0.6] }}
          className={meta.ring}
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={r}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - fillRatio * circumference}
          strokeLinecap="round"
          strokeWidth={2}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        />
      )}
    </svg>
  );
}

// ============================================
// AGENT CARD COMPONENT
// ============================================

export function AgentCard({
  agent,
  config,
  isAdmin,
  lastActivity,
  taskCount,
  blockedReason,
  onToggle,
  index,
  currentTaskTitle,
}: {
  agent: (typeof AGENTS)[number];
  config: Record<string, unknown>;
  isAdmin: boolean;
  lastActivity: { level: string; createdAt: number } | undefined;
  taskCount: number;
  blockedReason?: { reason: string; actionUrl?: string };
  onToggle: (field: string, value: boolean) => void;
  index: number;
  currentTaskTitle?: string;
}) {
  const enabled = (config[agent.configField] as boolean | undefined) !== false;
  const isBlocked = enabled && blockedReason !== undefined;
  const status = getAgentStatus(enabled, lastActivity, isBlocked);
  const meta = STATUS_META[status];

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative rounded-lg border border-border/50 bg-card/50 p-3 backdrop-blur-sm transition-shadow hover:border-border",
        meta.glow && `hover:shadow-lg hover:${meta.glow}`,
        status === "disabled" && "opacity-50"
      )}
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
    >
      <div className="flex items-start gap-2.5">
        <div className="relative">
          <StatusRing size={36} status={status} />
          <agent.icon
            className={cn(
              "absolute top-1/2 left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2",
              meta.color
            )}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[13px] tracking-tight">
              {agent.label}
            </span>
            <div className="flex items-center gap-1.5">
              <AnimatePresence>
                {taskCount > 0 && (
                  <motion.span
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex size-[18px] items-center justify-center rounded bg-primary/10 font-bold font-mono text-[9px] text-primary"
                    exit={{ opacity: 0, scale: 0.8 }}
                    initial={{ opacity: 0, scale: 0.8 }}
                  >
                    {taskCount}
                  </motion.span>
                )}
              </AnimatePresence>
              <Switch
                checked={enabled}
                disabled={!isAdmin}
                onCheckedChange={(v) => onToggle(agent.configField, v)}
                size="sm"
              />
            </div>
          </div>

          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              className={cn(
                "font-medium text-[10px] uppercase tracking-widest",
                meta.color
              )}
            >
              {meta.label}
            </span>
            {lastActivity && status !== "blocked" && status !== "disabled" && (
              <Tooltip>
                <TooltipTrigger>
                  <span className="text-[10px] text-muted-foreground/30">
                    {formatDistanceToNow(lastActivity.createdAt, {
                      addSuffix: true,
                    })}
                  </span>
                </TooltipTrigger>
                <TooltipContent>Last activity</TooltipContent>
              </Tooltip>
            )}
          </div>

          {isBlocked && blockedReason && (
            <p className="mt-1 text-[10px] text-amber-500/80 leading-tight">
              {blockedReason.reason}
            </p>
          )}

          {currentTaskTitle && !isBlocked && status === "active" && (
            <p className="mt-1 truncate text-[10px] text-muted-foreground/60 leading-tight">
              {currentTaskTitle}
            </p>
          )}

          {/* Cost + task stats when available */}
          {status !== "disabled" &&
            (taskCount > 0 || (lastActivity && status === "active")) && (
              <div className="mt-1.5 flex items-center gap-2">
                {taskCount > 0 && (
                  <span className="text-[10px] text-muted-foreground/40">
                    {taskCount} task{taskCount === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// PIPELINE CONNECTOR — animated dashed line
// ============================================

export function PipelineConnector() {
  return (
    <div className="flex shrink-0 items-center px-0.5">
      <svg
        aria-hidden="true"
        className="overflow-visible"
        height="2"
        viewBox="0 0 20 2"
        width="20"
      >
        <motion.line
          animate={{ pathLength: 1, opacity: 0.3 }}
          initial={{ pathLength: 0, opacity: 0 }}
          stroke="currentColor"
          strokeDasharray="3 3"
          strokeWidth={1.5}
          transition={{ duration: 0.6, delay: 0.3 }}
          x1="0"
          x2="20"
          y1="1"
          y2="1"
        />
      </svg>
    </div>
  );
}

// ============================================
// SECTION LABEL
// ============================================

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="font-semibold text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em]">
        {children}
      </span>
      <div className="h-px flex-1 bg-border/30" />
    </div>
  );
}
