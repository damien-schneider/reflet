"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import {
  IconAlertTriangle,
  IconCheck,
  IconFilter,
  IconInfoCircle,
  IconPlayerPlay,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { type ComponentType, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { H2 } from "@/components/ui/typography";
import {
  ACTIVITY_AGENT_BADGE_STYLES,
  ACTIVITY_AGENT_LABELS,
  ACTIVITY_AGENTS,
  ACTIVITY_LEVELS,
  type ActivityAgent,
  type ActivityLevel,
  getActivityAgentLabel,
} from "@/features/autopilot/components/activity/presentation";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { cn } from "@/lib/utils";

const LEVEL_ICONS = {
  info: IconInfoCircle,
  action: IconPlayerPlay,
  success: IconCheck,
  warning: IconAlertTriangle,
  error: IconX,
} satisfies Record<ActivityLevel, ComponentType<{ className?: string }>>;

const LEVEL_LABELS = {
  info: "Info",
  action: "Action",
  success: "Success",
  warning: "Warning",
  error: "Error",
} satisfies Record<ActivityLevel, string>;

const AGENT_OPTIONS = ACTIVITY_AGENTS.map((agent) => ({
  label: ACTIVITY_AGENT_LABELS[agent],
  value: agent,
}));

const LEVEL_OPTIONS = ACTIVITY_LEVELS.map((level) => ({
  label: LEVEL_LABELS[level],
  value: level,
}));

type AgentFilter = ActivityAgent | "all";
type LevelFilter = ActivityLevel | "all";

export default function ActivityPage() {
  const { organizationId } = useAutopilotContext();
  const [agentFilter, setAgentFilter] = useState<AgentFilter>("all");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [search, setSearch] = useState("");

  const activity = useQuery(
    api.autopilot.queries.activity.listActivityFiltered,
    {
      organizationId,
      agent: agentFilter === "all" ? undefined : agentFilter,
      level: levelFilter === "all" ? undefined : levelFilter,
    }
  );

  const searchText = search.toLowerCase();
  const filtered =
    activity === undefined
      ? undefined
      : activity.filter(
          (entry) =>
            searchText === "" ||
            entry.message.toLowerCase().includes(searchText) ||
            entry.details?.toLowerCase().includes(searchText)
        );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <H2 variant="card">Activity Log</H2>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <IconSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity…"
            value={search}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <IconFilter className="size-4 text-muted-foreground" />
          <Select
            onValueChange={(value) => {
              const nextAgent = AGENT_OPTIONS.find(
                (option) => option.value === value
              )?.value;
              setAgentFilter(nextAgent ?? "all");
            }}
            value={agentFilter}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {AGENT_OPTIONS.map(({ label, value }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={(value) => {
              const nextLevel = LEVEL_OPTIONS.find(
                (option) => option.value === value
              )?.value;
              setLevelFilter(nextLevel ?? "all");
            }}
            value={levelFilter}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {LEVEL_OPTIONS.map(({ label, value }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      <ActivityResults filtered={filtered} />
    </div>
  );
}

interface ActivityEntry {
  _id: string;
  agent: ActivityAgent;
  createdAt: number;
  details?: string;
  level: ActivityLevel;
  message: string;
}

function ActivityResults({
  filtered,
}: {
  filtered: ActivityEntry[] | undefined;
}) {
  if (filtered === undefined) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton
            className="h-14 w-full rounded-xl"
            key={`skel-${String(i)}`}
          />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
        No activity matches your filters.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {filtered.map((entry) => {
        const LevelIcon = LEVEL_ICONS[entry.level];
        const agentColor = ACTIVITY_AGENT_BADGE_STYLES[entry.agent];

        return (
          <div
            className="relative rounded-xl border bg-card px-4 py-3"
            key={entry._id}
          >
            <div className="flex items-center gap-2">
              <div className={cn("inline-flex rounded-full p-1", agentColor)}>
                <LevelIcon className="size-3" />
              </div>
              <Badge
                className={cn(
                  "absolute top-2.5 right-3 text-[10px]",
                  agentColor
                )}
                variant="outline"
              >
                {getActivityAgentLabel(entry.agent)}
              </Badge>
              <span className="text-[11px] text-muted-foreground/50">
                {formatDistanceToNow(entry.createdAt, {
                  addSuffix: true,
                })}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-foreground/80 leading-relaxed">
              {entry.message}
            </p>
            {entry.details && (
              <p className="mt-0.5 text-muted-foreground/60 text-xs">
                {entry.details}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
