"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  backlog: "bg-muted text-muted-foreground",
  todo: "bg-blue-500/10 text-blue-500",
  in_progress: "bg-amber-500/10 text-amber-500",
  in_review: "bg-purple-500/10 text-purple-500",
  done: "bg-green-500/10 text-green-500",
  cancelled: "bg-red-500/10 text-red-500",
};

interface GoalNode {
  children: GoalNode[];
  completionPercent?: number;
  id: string;
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
          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50",
          depth > 0 && "border-t"
        )}
        onClick={() => {
          if (hasChildren) {
            setExpanded((prev) => !prev);
          }
        }}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
        type="button"
      >
        {hasChildren ? (
          <ChevronIcon className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <span className="size-4 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate">{node.title}</span>
        <Badge
          className={cn(
            "text-xs",
            STATUS_STYLES[node.status] ?? STATUS_STYLES.backlog
          )}
          variant="secondary"
        >
          {node.status.replace("_", " ")}
        </Badge>
        {node.completionPercent !== undefined && (
          <span className="text-muted-foreground text-xs">
            {node.completionPercent}%
          </span>
        )}
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

export function GoalTree({ organizationId }: { organizationId: string }) {
  const initiatives = useQuery(api.autopilot.queries.work.listWorkItems, {
    organizationId: organizationId as never,
    type: "initiative",
  });

  if (initiatives === undefined) {
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

  const tree: GoalNode[] = initiatives.map((init) => ({
    id: init._id,
    title: init.title,
    status: init.status,
    completionPercent: init.completionPercent,
    children: [],
  }));

  if (tree.length === 0) {
    return (
      <div className="flex h-20 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
        No initiatives yet — PM will create them from your product definition
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
