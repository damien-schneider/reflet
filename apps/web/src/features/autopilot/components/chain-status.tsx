"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconCheck,
  IconCircleDashed,
  IconCircleDot,
  IconClock,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import type { ComponentType } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type NodeStatus = "missing" | "draft" | "pending_review" | "published";
type ChainNodeKind =
  | "codebase_understanding"
  | "app_description"
  | "market_analysis"
  | "target_definition"
  | "personas"
  | "use_cases"
  | "lead_targets"
  | "community_posts"
  | "drafts";

const NODE_LABELS: Record<ChainNodeKind, string> = {
  codebase_understanding: "Codebase Understanding",
  app_description: "App Description",
  market_analysis: "Market Analysis",
  target_definition: "Target Definition",
  personas: "Personas",
  use_cases: "Use Cases",
  lead_targets: "Lead Targets",
  community_posts: "Community Posts",
  drafts: "Drafts",
};

const NODE_OWNERS: Record<ChainNodeKind, string> = {
  codebase_understanding: "cto",
  app_description: "cto",
  market_analysis: "growth",
  target_definition: "pm",
  personas: "pm",
  use_cases: "pm",
  lead_targets: "sales",
  community_posts: "growth",
  drafts: "growth",
};

const DAG_DEPS: Record<ChainNodeKind, ChainNodeKind[]> = {
  codebase_understanding: [],
  app_description: ["codebase_understanding"],
  market_analysis: ["app_description"],
  target_definition: ["market_analysis"],
  personas: ["target_definition"],
  use_cases: ["personas"],
  lead_targets: ["personas"],
  community_posts: ["personas", "use_cases"],
  drafts: ["community_posts"],
};

const NODE_ORDER: ChainNodeKind[] = [
  "codebase_understanding",
  "app_description",
  "market_analysis",
  "target_definition",
  "personas",
  "use_cases",
  "lead_targets",
  "community_posts",
  "drafts",
];

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

  if (!chain) {
    return (
      <div className="text-muted-foreground text-sm">Loading chain state…</div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold text-lg">Document Chain</h2>
        <span className="text-muted-foreground text-xs">
          DAG of canonical artifacts (admin view)
        </span>
      </div>
      <ol className="space-y-2">
        {NODE_ORDER.map((kind) => {
          const status = chain[kind];
          const meta = STATUS_META[status];
          const Icon = meta.icon;
          const deps = DAG_DEPS[kind];
          const upstreamReady = deps.every((dep) => chain[dep] === "published");
          const isActionable = status === "missing" && upstreamReady;
          return (
            <li
              className={cn(
                "flex items-start justify-between rounded-lg border bg-card p-3",
                isActionable && "border-amber-500/40"
              )}
              key={kind}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn("mt-0.5 size-4", meta.color)} />
                <div>
                  <div className="font-medium text-sm">{NODE_LABELS[kind]}</div>
                  <div className="mt-0.5 text-muted-foreground text-xs">
                    Owner: {NODE_OWNERS[kind]}
                    {deps.length > 0 && (
                      <>
                        {" · Deps: "}
                        {deps.map((d) => NODE_LABELS[d]).join(", ")}
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isActionable && (
                  <Badge className="text-xs" variant="outline">
                    Ready to produce
                  </Badge>
                )}
                <Badge className="text-xs" variant="secondary">
                  {meta.label}
                </Badge>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
