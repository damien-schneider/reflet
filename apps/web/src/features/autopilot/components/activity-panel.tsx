"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconAlertTriangle,
  IconCheck,
  IconChevronRight,
  IconFilter,
  IconInfoCircle,
  IconPlayerPlay,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { usePaginatedQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ACTIVITY_AGENT_BADGE_STYLES,
  ACTIVITY_AGENT_LABELS,
  ACTIVITY_AGENTS,
  ACTIVITY_LEVELS,
  type ActivityAgent,
  type ActivityLevel,
  getActivityAgentLabel,
} from "@/features/autopilot/components/activity/presentation";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 30;
const LOAD_MORE_PIXEL_BUFFER = 200;

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

interface ActivityPanelProps {
  organizationId: Id<"organizations">;
}

export function ActivityPanel({ organizationId }: ActivityPanelProps) {
  const [agentFilter, setAgentFilter] = useState<AgentFilter>("all");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { results, status, loadMore } = usePaginatedQuery(
    api.autopilot.queries.activity.listActivityPaginated,
    {
      organizationId,
      agent: agentFilter === "all" ? undefined : agentFilter,
      level: levelFilter === "all" ? undefined : levelFilter,
    },
    { initialNumItems: PAGE_SIZE }
  );

  const searchText = search.toLowerCase();
  const filtered = useMemo(() => {
    if (!searchText) {
      return results;
    }
    return results.filter(
      (entry) =>
        entry.message.toLowerCase().includes(searchText) ||
        entry.details?.toLowerCase().includes(searchText)
    );
  }, [results, searchText]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const handleLoadMore = useCallback(() => {
    if (status === "CanLoadMore") {
      loadMore(PAGE_SIZE);
    }
  }, [status, loadMore]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          handleLoadMore();
        }
      },
      { rootMargin: `${LOAD_MORE_PIXEL_BUFFER}px` }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [handleLoadMore]);

  return (
    <div className="space-y-4">
      <ActivityFilters
        agentFilter={agentFilter}
        levelFilter={levelFilter}
        onAgentChange={setAgentFilter}
        onLevelChange={setLevelFilter}
        onSearchChange={setSearch}
        search={search}
      />
      <ActivityResults
        expandedId={expandedId}
        filtered={filtered}
        onToggleExpand={(id) =>
          setExpandedId((prev) => (prev === id ? null : id))
        }
        status={status}
      />
      {status === "CanLoadMore" && (
        <div
          className="flex items-center justify-center pt-2"
          ref={sentinelRef}
        >
          <Button
            onClick={() => loadMore(PAGE_SIZE)}
            size="sm"
            type="button"
            variant="outline"
          >
            Load more
          </Button>
        </div>
      )}
      {status === "LoadingMore" && (
        <div className="space-y-2 pt-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton
              className="h-14 w-full rounded-xl"
              key={`load-more-skel-${String(i)}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ActivityFiltersProps {
  agentFilter: AgentFilter;
  levelFilter: LevelFilter;
  onAgentChange: (value: AgentFilter) => void;
  onLevelChange: (value: LevelFilter) => void;
  onSearchChange: (value: string) => void;
  search: string;
}

function ActivityFilters({
  agentFilter,
  levelFilter,
  onAgentChange,
  onLevelChange,
  onSearchChange,
  search,
}: ActivityFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1">
        <IconSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search activity…"
          value={search}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <IconFilter className="size-4 text-muted-foreground" />
        <Select
          onValueChange={(value) =>
            onAgentChange(value === "all" ? "all" : (value as ActivityAgent))
          }
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
          onValueChange={(value) =>
            onLevelChange(value === "all" ? "all" : (value as ActivityLevel))
          }
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
  );
}

interface ActivityEntry {
  _id: string;
  action?: string;
  agent: ActivityAgent;
  createdAt: number;
  details?: string;
  entityId?: string;
  entityType?: string;
  level: ActivityLevel;
  message: string;
  targetAgent?: ActivityAgent;
  workItemId?: string;
}

interface ActivityResultsProps {
  expandedId: string | null;
  filtered: ActivityEntry[];
  onToggleExpand: (id: string) => void;
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
}

function ActivityResults({
  expandedId,
  filtered,
  onToggleExpand,
  status,
}: ActivityResultsProps) {
  if (status === "LoadingFirstPage") {
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
      {filtered.map((entry) => (
        <ActivityRow
          entry={entry}
          isExpanded={expandedId === entry._id}
          key={entry._id}
          onToggle={() => onToggleExpand(entry._id)}
        />
      ))}
    </div>
  );
}

interface ActivityRowProps {
  entry: ActivityEntry;
  isExpanded: boolean;
  onToggle: () => void;
}

function ActivityRow({ entry, isExpanded, onToggle }: ActivityRowProps) {
  const LevelIcon = LEVEL_ICONS[entry.level];
  const agentColor = ACTIVITY_AGENT_BADGE_STYLES[entry.agent];

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <button
        aria-expanded={isExpanded}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
        onClick={onToggle}
        type="button"
      >
        <div
          className={cn(
            "mt-0.5 inline-flex shrink-0 rounded-full p-1",
            agentColor
          )}
        >
          <LevelIcon className="size-3" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge className={cn("text-[10px]", agentColor)} variant="outline">
              {getActivityAgentLabel(entry.agent)}
            </Badge>
            {entry.targetAgent && (
              <Badge className="text-[10px]" variant="secondary">
                → {getActivityAgentLabel(entry.targetAgent)}
              </Badge>
            )}
            <span className="ml-auto text-[11px] text-muted-foreground/60">
              {formatDistanceToNow(entry.createdAt, { addSuffix: true })}
            </span>
            <IconChevronRight
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform",
                isExpanded && "rotate-90"
              )}
            />
          </div>
          <p className="mt-1 text-[13px] text-foreground/80 leading-relaxed">
            {entry.message}
          </p>
          {!isExpanded && entry.details && (
            <p className="mt-0.5 truncate text-muted-foreground/60 text-xs">
              {entry.details}
            </p>
          )}
        </div>
      </button>
      {isExpanded && <ActivityDetails entry={entry} />}
    </div>
  );
}

function ActivityDetails({ entry }: { entry: ActivityEntry }) {
  const metaRows: Array<{ label: string; value: string }> = [
    { label: "Level", value: LEVEL_LABELS[entry.level] },
    { label: "Agent", value: getActivityAgentLabel(entry.agent) },
  ];
  if (entry.targetAgent) {
    metaRows.push({
      label: "Target",
      value: getActivityAgentLabel(entry.targetAgent),
    });
  }
  if (entry.action) {
    metaRows.push({ label: "Action", value: entry.action });
  }
  if (entry.entityType) {
    metaRows.push({ label: "Entity type", value: entry.entityType });
  }
  if (entry.entityId) {
    metaRows.push({ label: "Entity id", value: entry.entityId });
  }
  if (entry.workItemId) {
    metaRows.push({ label: "Work item", value: entry.workItemId });
  }
  metaRows.push({
    label: "Timestamp",
    value: new Date(entry.createdAt).toISOString(),
  });

  return (
    <div className="space-y-3 border-t bg-muted/20 px-4 py-3">
      {entry.details && (
        <pre className="whitespace-pre-wrap rounded-md bg-background p-3 text-muted-foreground text-xs">
          {entry.details}
        </pre>
      )}
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
        {metaRows.map((row) => (
          <div className="contents" key={row.label}>
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="break-all font-mono text-foreground/80">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
