"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const LEVEL_LABELS: Record<string, string> = {
  company: "Company",
  team: "Team",
  initiative: "Initiative",
};

const LEVEL_BADGE_STYLES: Record<string, string> = {
  company: "bg-indigo-500/10 text-indigo-500 border-indigo-500/30",
  team: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  initiative: "bg-purple-500/10 text-purple-500 border-purple-500/30",
};

const STATUS_STYLES: Record<string, string> = {
  discovery: "bg-blue-500/10 text-blue-500",
  definition: "bg-purple-500/10 text-purple-500",
  active: "bg-green-500/10 text-green-500",
  completed: "bg-emerald-500/10 text-emerald-500",
  paused: "bg-muted text-muted-foreground",
  cancelled: "bg-red-500/10 text-red-500",
};

interface GoalNode {
  children: GoalNode[];
  completionPercent?: number;
  id: string;
  level: "company" | "team" | "initiative";
  status: string;
  title: string;
}

function GoalTreeNode({ node, depth }: { node: GoalNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 1);

  const hasChildren = node.children.length > 0;
  const ChevronIcon = expanded ? IconChevronDown : IconChevronRight;

  return (
    <div>
      <button
        className={cn(
          "flex w-full items-center gap-2 rounded-md py-1.5 text-left transition-colors hover:bg-muted/50",
          !hasChildren && "cursor-default"
        )}
        onClick={hasChildren ? () => setExpanded(!expanded) : undefined}
        style={{ paddingLeft: depth * 16 + 12 }}
        type="button"
      >
        {hasChildren ? (
          <ChevronIcon className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <span className="size-4 shrink-0" />
        )}

        <Badge
          className={cn(
            "text-[10px]",
            LEVEL_BADGE_STYLES[node.level] ?? LEVEL_BADGE_STYLES.initiative
          )}
          variant="outline"
        >
          {LEVEL_LABELS[node.level] ?? node.level}
        </Badge>

        <span className="min-w-0 flex-1 truncate text-sm">{node.title}</span>

        {node.completionPercent !== undefined && (
          <span className="shrink-0 text-muted-foreground text-xs">
            {node.completionPercent}%
          </span>
        )}

        <Badge
          className={cn(
            "shrink-0 text-[10px]",
            STATUS_STYLES[node.status] ?? STATUS_STYLES.discovery
          )}
          variant="outline"
        >
          {node.status}
        </Badge>
      </button>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <GoalTreeNode depth={depth + 1} key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Build a goal tree from knowledge docs (goals_okrs type) and initiatives.
 *
 * Company goals are derived from knowledge docs, with initiatives as children.
 */
function buildGoalTree(
  knowledgeDocs: Array<{ _id: string; docType: string; title: string }>,
  initiatives: Array<{
    _id: string;
    title: string;
    status: string;
    completionPercent?: number;
  }>
): GoalNode[] {
  // Create company-level nodes from goals_okrs knowledge docs
  const companyGoals: GoalNode[] = knowledgeDocs
    .filter((doc) => doc.docType === "goals_okrs")
    .map((doc) => ({
      id: doc._id,
      title: doc.title,
      level: "company" as const,
      status: "active",
      children: initiatives.map((init) => ({
        id: init._id,
        title: init.title,
        level: "initiative" as const,
        status: init.status,
        completionPercent: init.completionPercent,
        children: [],
      })),
    }));

  // If no knowledge docs with goals, show initiatives at top level
  if (companyGoals.length === 0 && initiatives.length > 0) {
    return initiatives.map((init) => ({
      id: init._id,
      title: init.title,
      level: "initiative" as const,
      status: init.status,
      completionPercent: init.completionPercent,
      children: [],
    }));
  }

  return companyGoals;
}

export function GoalTree({ organizationId }: { organizationId: string }) {
  const knowledgeDocs = useQuery(
    api.autopilot.queries.knowledge.listKnowledgeDocs,
    { organizationId: organizationId as never }
  );

  const initiatives = useQuery(api.autopilot.queries.work.listWorkItems, {
    organizationId: organizationId as never,
    type: "initiative",
  });

  if (knowledgeDocs === undefined || initiatives === undefined) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton
            className="h-8 w-full rounded-md"
            key={`skel-${String(i)}`}
          />
        ))}
      </div>
    );
  }

  const tree = buildGoalTree(
    knowledgeDocs,
    initiatives as Array<{
      _id: string;
      title: string;
      status: string;
      completionPercent?: number;
    }>
  );

  if (tree.length === 0) {
    return (
      <div className="flex h-20 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
        No goals or initiatives yet
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      {tree.map((node) => (
        <GoalTreeNode depth={0} key={node.id} node={node} />
      ))}
    </div>
  );
}
