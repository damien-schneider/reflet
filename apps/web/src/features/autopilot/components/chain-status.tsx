"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { chainNodeStatus } from "@reflet/backend/convex/autopilot/schema/validators";
import {
  IconCheck,
  IconCircleDashed,
  IconCircleDot,
  IconClock,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import type { Infer } from "convex/values";
import type { ComponentType } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type NodeStatus = Infer<typeof chainNodeStatus>;
type ChainNodeKind =
  | "codebase_understanding"
  | "identity"
  | "brand_voice"
  | "feature_catalog"
  | "scope"
  | "market_analysis"
  | "target_definition"
  | "personas"
  | "use_cases"
  | "lead_targets"
  | "community_posts"
  | "drafts";

const STATUS_META: Record<
  NodeStatus,
  { label: string; icon: ComponentType<{ className?: string }>; color: string }
> = {
  missing: {
    label: "Missing",
    icon: IconCircleDashed,
    color: "text-muted-foreground",
  },
  draft: {
    label: "Draft",
    icon: IconCircleDot,
    color: "text-blue-500",
  },
  pending_review: {
    label: "Pending Review",
    icon: IconClock,
    color: "text-amber-500",
  },
  published: {
    label: "Published",
    icon: IconCheck,
    color: "text-emerald-500",
  },
};

interface ChainStatusProps {
  organizationId: Id<"organizations">;
}

export function ChainStatus({ organizationId }: ChainStatusProps) {
  const chain = useQuery(api.autopilot.queries.chain.getChainStatePublic, {
    organizationId,
  });
  const meta = useQuery(api.autopilot.queries.chain.getChainMeta, {});
  const activeWork = useQuery(api.autopilot.queries.chain.getActiveChainWork, {
    organizationId,
  });

  if (!(chain && meta)) {
    return (
      <div className="text-muted-foreground text-sm">Loading chain state…</div>
    );
  }

  const labels = new Map<ChainNodeKind, string>(
    meta.nodes.map((n) => [n.kind, n.label])
  );

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold text-lg">Document Chain</h2>
        <span className="text-muted-foreground text-xs">
          DAG of canonical artifacts (admin view)
        </span>
      </div>
      <ol className="space-y-2">
        {meta.nodes.map((node) => {
          const kind = node.kind as ChainNodeKind;
          const status = chain[kind] as NodeStatus;
          const statusMeta = STATUS_META[status];
          const Icon = statusMeta.icon;
          const upstreamReady = node.deps.every(
            (dep) => chain[dep as ChainNodeKind] === "published"
          );
          const isActionable = status === "missing" && upstreamReady;
          const isActive = activeWork?.activeNode === kind;
          return (
            <li
              className={cn(
                "flex items-start justify-between rounded-lg border bg-card p-3",
                isActionable && "border-amber-500/40",
                isActive && "border-emerald-500/60 ring-1 ring-emerald-500/20"
              )}
              key={kind}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn("mt-0.5 size-4", statusMeta.color)} />
                <div>
                  <div className="font-medium text-sm">{node.label}</div>
                  <div className="mt-0.5 text-muted-foreground text-xs">
                    Owner: {node.owner}
                    {node.deps.length > 0 && (
                      <>
                        {" · Deps: "}
                        {node.deps.map((d) => labels.get(d) ?? d).join(", ")}
                      </>
                    )}
                  </div>
                  {isActive && activeWork?.message ? (
                    <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                      {activeWork.message}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isActive && (
                  <Badge className="text-xs" variant="green">
                    Working now
                  </Badge>
                )}
                {isActionable && !isActive && (
                  <Badge className="text-xs" variant="outline">
                    Ready to produce
                  </Badge>
                )}
                <Badge className="text-xs" variant="secondary">
                  {statusMeta.label}
                </Badge>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
