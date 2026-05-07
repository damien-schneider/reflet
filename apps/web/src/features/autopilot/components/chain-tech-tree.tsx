"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useRef } from "react";

import { Badge } from "@/components/ui/badge";

import { ChainTechTreeCard } from "./chain-tech-tree-card";
import { ChainTechTreeConnectors } from "./chain-tech-tree-connectors";

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

type Owner = "cto" | "pm" | "growth" | "sales";

interface StageDef {
  id: string;
  label: string;
  nodes: ChainNodeKind[];
}

const STAGES: StageDef[] = [
  {
    id: "foundation",
    label: "Foundation",
    nodes: ["codebase_understanding", "app_description"],
  },
  {
    id: "market",
    label: "Market",
    nodes: ["market_analysis", "target_definition"],
  },
  {
    id: "audience",
    label: "Audience",
    nodes: ["personas", "use_cases"],
  },
  {
    id: "outreach",
    label: "Outreach",
    nodes: ["lead_targets", "community_posts"],
  },
  {
    id: "distribution",
    label: "Distribution",
    nodes: ["drafts"],
  },
];

const NODE_LABELS: Record<ChainNodeKind, string> = {
  codebase_understanding: "Codebase understanding",
  app_description: "App description",
  market_analysis: "Market analysis",
  target_definition: "Target definition",
  personas: "Personas",
  use_cases: "Use cases",
  lead_targets: "Lead targets",
  community_posts: "Community posts",
  drafts: "Drafts",
};

const NODE_PLURALS: Record<ChainNodeKind, string> = {
  codebase_understanding: "docs",
  app_description: "docs",
  market_analysis: "docs",
  target_definition: "docs",
  personas: "personas",
  use_cases: "use cases",
  lead_targets: "leads",
  community_posts: "posts",
  drafts: "drafts",
};

const DAG_EDGES: Array<{ from: ChainNodeKind; to: ChainNodeKind }> = [
  { from: "codebase_understanding", to: "app_description" },
  { from: "app_description", to: "market_analysis" },
  { from: "market_analysis", to: "target_definition" },
  { from: "target_definition", to: "personas" },
  { from: "personas", to: "use_cases" },
  { from: "personas", to: "lead_targets" },
  { from: "personas", to: "community_posts" },
  { from: "use_cases", to: "community_posts" },
  { from: "community_posts", to: "drafts" },
];

const isOwner = (s: string): s is Owner =>
  s === "cto" || s === "pm" || s === "growth" || s === "sales";

interface ChainTechTreeProps {
  organizationId: Id<"organizations">;
}

export function ChainTechTree({ organizationId }: ChainTechTreeProps) {
  const overview = useQuery(api.autopilot.queries.chain.getChainOverview, {
    organizationId,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const refMap = useRef<Map<ChainNodeKind, HTMLElement>>(new Map());

  const setCardRef = (kind: ChainNodeKind) => (el: HTMLDivElement | null) => {
    if (el) {
      refMap.current.set(kind, el);
      return;
    }
    refMap.current.delete(kind);
  };

  const nodesByKind = overview
    ? new Map<ChainNodeKind, (typeof overview.nodes)[number]>()
    : null;
  if (overview && nodesByKind) {
    for (const n of overview.nodes) {
      nodesByKind.set(n.kind, n);
    }
  }

  const highlightTargets = new Set<ChainNodeKind>();
  if (overview) {
    for (const n of overview.nodes) {
      if (n.actionable) {
        highlightTargets.add(n.kind);
      }
    }
  }

  if (!(overview && nodesByKind)) {
    return (
      <div className="space-y-3">
        <div className="h-7 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {STAGES.map((stage) => (
            <div className="space-y-2" key={stage.id}>
              <div className="h-5 w-24 animate-pulse rounded bg-muted" />
              {stage.nodes.map((k) => (
                <div
                  className="h-20 animate-pulse rounded-xl bg-muted"
                  key={k}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-semibold text-lg">Document chain</h2>
          <p className="text-muted-foreground text-xs">
            DAG of canonical artifacts. Each stage advances when its upstream is
            published.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant={overview.gatedByOpenTasks ? "orange" : "gray"}>
            {overview.openTaskCount}/{overview.wakeThreshold} open tasks
          </Badge>
          {overview.gatedByOpenTasks && (
            <span className="text-muted-foreground">
              Chain gated — clear tasks to resume
            </span>
          )}
        </div>
      </div>

      <div className="relative" ref={containerRef}>
        <div className="grid grid-cols-1 gap-x-12 gap-y-3 md:grid-cols-3 xl:grid-cols-5">
          {STAGES.map((stage) => {
            const totalInStage = stage.nodes.length;
            const doneInStage = stage.nodes.filter(
              (k) => nodesByKind.get(k)?.status === "published"
            ).length;
            return (
              <div className="flex flex-col gap-3" key={stage.id}>
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider">
                    {stage.label}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {doneInStage}/{totalInStage}
                  </span>
                </div>
                {stage.nodes.map((kind) => {
                  const node = nodesByKind.get(kind);
                  if (!node) {
                    return null;
                  }
                  const owner = isOwner(node.owner) ? node.owner : "cto";
                  return (
                    <ChainTechTreeCard
                      actionable={node.actionable}
                      artifactCount={node.artifactCount}
                      avgValidationScore={node.avgValidationScore}
                      key={kind}
                      kind={kind}
                      label={NODE_LABELS[kind]}
                      lastUpdatedAt={node.lastUpdatedAt}
                      owner={owner}
                      pluralNoun={NODE_PLURALS[kind]}
                      ref={setCardRef(kind)}
                      status={node.status}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
        <ChainTechTreeConnectors
          containerRef={containerRef}
          edges={DAG_EDGES}
          highlightTargets={highlightTargets}
          refMap={refMap}
        />
      </div>
    </div>
  );
}
