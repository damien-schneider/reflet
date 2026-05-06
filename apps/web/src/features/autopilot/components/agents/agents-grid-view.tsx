"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getAgentStatus } from "../agent-card";
import type { GridAgentId } from "./agent-grid-card";
import { AGENT_META, STATUS_LABELS } from "./agent-grid-card";

// ============================================
// LAYOUT CONSTANTS
// ============================================

const GRID_CELL = 60;
const INITIAL_ZOOM = 0.85;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.8;
const ZOOM_STEP = 0.15;

const PIPELINE_AGENTS: readonly GridAgentId[] = ["pm", "cto", "dev"] as const;
const SPECIALIST_AGENTS: readonly GridAgentId[] = [
  "growth",
  "support",
  "sales",
] as const;

/** Each group block defines its agents — the block is sliced into equal columns */
const GROUP_BLOCKS = [
  {
    id: "command",
    x: 300,
    y: 60,
    w: 300,
    h: 200,
    label: "Command",
    agents: ["orchestrator"] as GridAgentId[],
  },
  {
    id: "pipeline",
    x: 60,
    y: 300,
    w: 720,
    h: 200,
    label: "Core Pipeline",
    agents: ["pm", "cto", "dev"] as GridAgentId[],
  },
  {
    id: "specialists",
    x: 60,
    y: 540,
    w: 720,
    h: 200,
    label: "Specialists",
    agents: ["growth", "support", "sales"] as GridAgentId[],
  },
];

const ALL_AGENT_IDS: readonly GridAgentId[] = [
  "orchestrator",
  ...PIPELINE_AGENTS,
  ...SPECIALIST_AGENTS,
];

// ============================================
// MAIN COMPONENT
// ============================================

export function AgentsGridView({
  organizationId,
  baseUrl,
}: {
  organizationId: Id<"organizations">;
  baseUrl: string;
}) {
  const activity = useQuery(api.autopilot.queries.activity.listActivity, {
    organizationId,
    limit: 50,
  });
  const config = useQuery(api.autopilot.queries.config.getConfig, {
    organizationId,
  });
  const tasks = useQuery(api.autopilot.queries.work.listWorkItems, {
    organizationId,
    status: "in_progress",
  });
  const readiness = useQuery(
    api.autopilot.queries.dashboard.getAgentReadiness,
    { organizationId }
  );

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) {
      return;
    }
    if (e.target instanceof HTMLElement && e.target.closest("a, button")) {
      return;
    }
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) {
      return;
    }
    setPan({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) {
      return;
    }
    setIsPanning(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  if (activity === undefined || config === undefined) {
    return <IsometricSkeleton />;
  }

  if (!config) {
    return null;
  }

  // Build data maps
  const agentLastActivity = new Map<
    string,
    { level: string; createdAt: number }
  >();
  for (const entry of activity) {
    if (!agentLastActivity.has(entry.agent)) {
      agentLastActivity.set(entry.agent, {
        level: entry.level,
        createdAt: entry.createdAt,
      });
    }
  }

  const agentTaskCount = new Map<string, number>();
  const agentCurrentTask = new Map<string, string>();
  if (tasks) {
    for (const task of tasks) {
      const agent = task.assignedAgent ?? "unassigned";
      agentTaskCount.set(agent, (agentTaskCount.get(agent) ?? 0) + 1);
      if (!agentCurrentTask.has(agent)) {
        agentCurrentTask.set(agent, task.title);
      }
    }
  }

  const getEnabled = (agentId: GridAgentId): boolean => {
    if (agentId === "orchestrator") {
      return true;
    }
    const configField = `${agentId}Enabled` as string;
    return (
      (config as unknown as Record<string, unknown>)[configField] !== false
    );
  };

  const getBlocked = (agentId: GridAgentId): boolean => {
    if (agentId === "orchestrator") {
      return false;
    }
    const agentReadiness = readiness?.[agentId] as
      | { ready: boolean }
      | undefined;
    return (
      getEnabled(agentId) &&
      agentReadiness !== undefined &&
      !agentReadiness.ready
    );
  };

  const fiveMinutes = 5 * 60 * 1000;
  const activeCount = ALL_AGENT_IDS.filter((id) => {
    if (!getEnabled(id) || getBlocked(id)) {
      return false;
    }
    const last = agentLastActivity.get(id);
    if (last && last.level !== "error") {
      return Date.now() - last.createdAt < fiveMinutes;
    }
    return false;
  }).length;

  return (
    <div className="relative h-[680px] overflow-hidden rounded-2xl border border-border/40 bg-card">
      {/* Floating status counter — top-left */}
      <div className="absolute top-4 left-4 z-20">
        <StatusCounter activeCount={activeCount} total={7} />
      </div>

      {/* Floating zoom controls — bottom-right */}
      <div className="absolute right-4 bottom-4 z-20">
        <ZoomControls
          onReset={() => {
            setZoom(INITIAL_ZOOM);
            setPan({ x: 0, y: 0 });
          }}
          onZoomIn={() => setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM))}
          onZoomOut={() => setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM))}
          zoom={zoom}
        />
      </div>

      {/* Canvas — pannable area */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          isPanning ? "cursor-grabbing" : "cursor-grab"
        )}
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Isometric plane */}
        <div
          className={cn(
            "relative h-[900px] w-[900px]",
            !isPanning && "transition-transform duration-200 ease-out"
          )}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotateX(60deg) rotateZ(-45deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          {/* Orthogonal grid lines — SVG with Tailwind stroke classes */}
          <svg aria-hidden="true" className="absolute inset-0 size-full">
            <defs>
              <pattern
                height={GRID_CELL}
                id="iso-fine-grid"
                patternUnits="userSpaceOnUse"
                width={GRID_CELL}
              >
                <path
                  className="stroke-border/15 dark:stroke-border/10"
                  d={`M ${GRID_CELL} 0 L 0 0 0 ${GRID_CELL}`}
                  fill="none"
                  strokeWidth="0.5"
                />
              </pattern>
              <pattern
                height={GRID_CELL * 4}
                id="iso-coarse-grid"
                patternUnits="userSpaceOnUse"
                width={GRID_CELL * 4}
              >
                <rect
                  fill="url(#iso-fine-grid)"
                  height={GRID_CELL * 4}
                  width={GRID_CELL * 4}
                />
                <path
                  className="stroke-border/30 dark:stroke-border/15"
                  d={`M ${GRID_CELL * 4} 0 L 0 0 0 ${GRID_CELL * 4}`}
                  fill="none"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect fill="url(#iso-coarse-grid)" height="100%" width="100%" />
          </svg>

          {/* Group blocks — each sliced into agent columns */}
          {GROUP_BLOCKS.map((g) => (
            <IsoBlock
              agentData={{
                agentCurrentTask,
                agentLastActivity,
                agentTaskCount,
                baseUrl,
                getBlocked,
                getEnabled,
              }}
              agents={g.agents}
              h={g.h}
              key={g.id}
              label={g.label}
              w={g.w}
              x={g.x}
              y={g.y}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// ISO BLOCK — 3D group block sliced into agent columns
// ============================================

const DEPTH = 10;

interface AgentData {
  agentCurrentTask: Map<string, string>;
  agentLastActivity: Map<string, { level: string; createdAt: number }>;
  agentTaskCount: Map<string, number>;
  baseUrl: string;
  getBlocked: (id: GridAgentId) => boolean;
  getEnabled: (id: GridAgentId) => boolean;
}

function IsoBlock({
  x,
  y,
  w,
  h,
  label,
  agents,
  agentData,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  agents: GridAgentId[];
  agentData: AgentData;
}) {
  const sliceWidth = w / agents.length;

  return (
    <div
      className="absolute"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        transformStyle: "preserve-3d",
        transform: `translateZ(${DEPTH}px)`,
      }}
    >
      {/* Floating group label (counter-rotated to face camera) */}
      <div
        className="absolute -top-2 left-3"
        style={{
          transform: "translateZ(20px) rotateX(-60deg) rotateZ(45deg)",
          transformOrigin: "bottom left",
        }}
      >
        <span className="rounded-md bg-foreground/90 px-2.5 py-1 font-bold text-[11px] text-background uppercase tracking-[0.15em] dark:bg-foreground/80">
          {label}
        </span>
      </div>

      {/* Agent slices */}
      <div className="flex h-full">
        {agents.map((agentId, i) => (
          <AgentSlice
            agentData={agentData}
            agentId={agentId}
            isFirst={i === 0}
            isLast={i === agents.length - 1}
            key={agentId}
            width={sliceWidth}
          />
        ))}
      </div>

      {/* Right face (3D depth) */}
      <div
        className="pointer-events-none absolute top-0 left-full border-border/30 border-y border-r bg-muted/30 dark:bg-muted/15"
        style={{
          width: DEPTH,
          height: "100%",
          transform: "rotateY(90deg)",
          transformOrigin: "left",
        }}
      />

      {/* Bottom face (3D depth) */}
      <div
        className="pointer-events-none absolute top-full left-0 border-border/30 border-x border-b bg-muted/40 dark:bg-muted/20"
        style={{
          width: "100%",
          height: DEPTH,
          transform: "rotateX(-90deg)",
          transformOrigin: "top",
        }}
      />
    </div>
  );
}

// ============================================
// AGENT SLICE — clickable column within a group block
// ============================================

const SLICE_STATUS_BG: Record<string, string> = {
  active:
    "bg-emerald-50/80 hover:bg-emerald-100/80 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50",
  blocked:
    "bg-amber-50/60 hover:bg-amber-100/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/40",
  error:
    "bg-red-50/60 hover:bg-red-100/60 dark:bg-red-950/20 dark:hover:bg-red-950/40",
  idle: "bg-muted/30 hover:bg-muted/50 dark:bg-muted/10 dark:hover:bg-muted/20",
  disabled:
    "bg-muted/15 hover:bg-muted/25 dark:bg-muted/5 dark:hover:bg-muted/10",
};

const SLICE_INDICATOR: Record<string, string> = {
  active: "bg-emerald-500",
  blocked: "bg-amber-500",
  error: "bg-red-500",
  idle: "bg-muted-foreground/20",
  disabled: "bg-muted-foreground/10",
};

const SLICE_ICON_STYLE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  blocked: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  error: "bg-red-500/15 text-red-600 dark:text-red-400",
  idle: "bg-muted text-muted-foreground/50",
  disabled: "bg-muted/50 text-muted-foreground/25",
};

const SLICE_LABEL_COLOR: Record<string, string> = {
  active: "text-emerald-700 dark:text-emerald-300",
  blocked: "text-amber-700 dark:text-amber-300",
  error: "text-red-700 dark:text-red-300",
  idle: "text-foreground/60",
  disabled: "text-muted-foreground/30",
};

const SLICE_STATUS_TEXT: Record<string, string> = {
  active: "text-emerald-600/70 dark:text-emerald-400/70",
  blocked: "text-amber-600/70 dark:text-amber-400/70",
  error: "text-red-600/70 dark:text-red-400/70",
  idle: "text-muted-foreground/30",
  disabled: "text-muted-foreground/20",
};

function AgentSlice({
  agentId,
  width,
  isFirst,
  isLast,
  agentData,
}: {
  agentId: GridAgentId;
  width: number;
  isFirst: boolean;
  isLast: boolean;
  agentData: AgentData;
}) {
  const meta = AGENT_META[agentId];
  const status = getAgentStatus(
    agentData.getEnabled(agentId),
    agentData.agentLastActivity.get(agentId),
    agentData.getBlocked(agentId)
  );
  const taskCount = agentData.agentTaskCount.get(agentId) ?? 0;
  const isActive = status === "active";

  return (
    <Link
      className={cn(
        "group relative flex flex-col items-center justify-center border border-border/30 transition-colors duration-200",
        SLICE_STATUS_BG[status],
        isFirst && "rounded-l",
        isLast && "rounded-r",
        status === "disabled" && "opacity-60"
      )}
      href={`${agentData.baseUrl}/agents/${agentId}`}
      style={{ width }}
    >
      {/* Status indicator bar at top */}
      <div
        className={cn(
          "absolute top-0 right-2 left-2 h-[3px] rounded-b-full",
          SLICE_INDICATOR[status]
        )}
      />

      {/* Agent content — counter-rotated to be horizontal */}
      <div
        className="flex flex-col items-center gap-2"
        style={{
          transform: "rotateX(-60deg) rotateZ(45deg)",
          transformOrigin: "center center",
        }}
      >
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            SLICE_ICON_STYLE[status]
          )}
        >
          <meta.icon size={16} />
        </div>

        <span
          className={cn(
            "font-bold text-xs tracking-wide",
            SLICE_LABEL_COLOR[status]
          )}
        >
          {meta.label}
        </span>

        <div className="flex items-center gap-1.5">
          {isActive && (
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
          )}
          <span className={cn("text-[9px]", SLICE_STATUS_TEXT[status])}>
            {STATUS_LABELS[status]}
          </span>
          {taskCount > 0 && (
            <span className="flex size-3.5 items-center justify-center rounded-full bg-foreground/10 font-mono text-[8px] text-foreground/50">
              {taskCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ============================================
// STATUS COUNTER
// ============================================

function StatusCounter({
  activeCount,
  total,
}: {
  activeCount: number;
  total: number;
}) {
  const hasActive = activeCount > 0;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-card/80 px-3.5 py-2 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-1.5">
        <span className="relative flex size-2">
          {hasActive && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          )}
          <span
            className={cn(
              "relative inline-flex size-2 rounded-full",
              hasActive ? "bg-emerald-500" : "bg-muted-foreground/25"
            )}
          />
        </span>
        <span className="font-mono text-[11px] text-foreground/60">
          {activeCount}/{total}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground/40">active</span>
    </div>
  );
}

// ============================================
// ZOOM CONTROLS
// ============================================

function ZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
  zoom,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  zoom: number;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border/30 bg-card/80 shadow-sm backdrop-blur-sm">
      <button
        className="p-2.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        onClick={onZoomIn}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <div className="border-border/20 border-t px-2 py-1 text-center font-mono text-[9px] text-muted-foreground/40">
        {Math.round(zoom * 100)}%
      </div>
      <button
        className="border-border/20 border-t p-2.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        onClick={onZoomOut}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M5 12h14" />
        </svg>
      </button>
      <button
        className="border-border/20 border-t p-2.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        onClick={onReset}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
      </button>
    </div>
  );
}

// ============================================
// LOADING SKELETON
// ============================================

function IsometricSkeleton() {
  return (
    <div className="relative flex h-[680px] items-center justify-center overflow-hidden rounded-2xl border border-border/40 bg-background/50">
      <Skeleton className="h-[400px] w-[400px] rounded-2xl opacity-30" />
      <div className="absolute top-4 left-4">
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
    </div>
  );
}
