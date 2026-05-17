"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { chainNodeStatus } from "@reflet/backend/convex/autopilot/schema/validators";
import { useQuery } from "convex/react";
import type { Infer } from "convex/values";
import { useParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";

import { ChainNodePreviewDialog } from "./chain-node-preview-dialog";
import { ChainTechTreeCard } from "./chain-tech-tree-card";
import {
  ChainTechTreeConnectors,
  type EdgeVariant,
} from "./chain-tech-tree-connectors";

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

type Owner = "cto" | "pm" | "growth" | "sales";

const isOwner = (s: string): s is Owner =>
  s === "cto" || s === "pm" || s === "growth" || s === "sales";

interface NodePosition {
  col: number;
  row: number;
}

// Knowledge nodes (col 1-2) form a 2×2 grid of typed artifacts derived from
// codebase_understanding. Downstream (market → drafts) flows from col 3.
const TREE_POSITIONS: Record<ChainNodeKind, NodePosition> = {
  codebase_understanding: { col: 0, row: 1 },
  identity: { col: 1, row: 0 },
  brand_voice: { col: 1, row: 2 },
  feature_catalog: { col: 2, row: 0 },
  scope: { col: 2, row: 2 },
  market_analysis: { col: 3, row: 1 },
  target_definition: { col: 4, row: 1 },
  personas: { col: 5, row: 1 },
  use_cases: { col: 6, row: 0 },
  lead_targets: { col: 6, row: 2 },
  community_posts: { col: 7, row: 1 },
  drafts: { col: 8, row: 1 },
};

const TREE_COL_COUNT = 9;
const TREE_ROW_COUNT = 3;

type ChainNodeStatus = Infer<typeof chainNodeStatus>;

const computeEdgeVariant = (
  status: ChainNodeStatus,
  actionable: boolean,
  active: boolean
): EdgeVariant => {
  if (active) {
    return "active";
  }
  if (status === "published") {
    return "done";
  }
  if (status === "draft" || status === "pending_review" || actionable) {
    return "available";
  }
  return "locked";
};

interface ChainTechTreeProps {
  organizationId: Id<"organizations">;
}

export function ChainTechTree({ organizationId }: ChainTechTreeProps) {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params?.orgSlug ?? "";

  const overview = useQuery(api.autopilot.queries.chain.getChainOverview, {
    organizationId,
  });
  const meta = useQuery(api.autopilot.queries.chain.getChainMeta, {});
  const activeWork = useQuery(api.autopilot.queries.chain.getActiveChainWork, {
    organizationId,
  });

  const [previewKind, setPreviewKind] = useState<ChainNodeKind | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const refMap = useRef<Map<ChainNodeKind, HTMLElement>>(new Map());

  const setCardRef =
    (kind: ChainNodeKind) => (el: HTMLButtonElement | null) => {
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

  const metaByKind = meta
    ? new Map<ChainNodeKind, (typeof meta.nodes)[number]>(
        meta.nodes.map((n) => [n.kind, n])
      )
    : null;

  const activeNodeKind = activeWork?.activeNode ?? null;
  const variantByTarget = useMemo<Record<
    ChainNodeKind,
    EdgeVariant
  > | null>(() => {
    if (!overview) {
      return null;
    }
    return overview.nodes.reduce<Record<ChainNodeKind, EdgeVariant>>(
      (acc, node) => {
        acc[node.kind] = computeEdgeVariant(
          node.status,
          node.actionable,
          activeNodeKind === node.kind
        );
        return acc;
      },
      {} as Record<ChainNodeKind, EdgeVariant>
    );
  }, [overview, activeNodeKind]);

  if (!(overview && nodesByKind && meta && metaByKind && variantByTarget)) {
    return (
      <div className="space-y-3">
        <div className="h-7 w-48 animate-pulse rounded bg-muted" />
        <div className="flex gap-3 overflow-x-auto">
          {Array.from({ length: TREE_COL_COUNT }, (_, i) => (
            <div
              className="h-24 w-[180px] shrink-0 animate-pulse rounded-xl bg-muted"
              key={`skeleton-col-${String(i)}`}
            />
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
            DAG of canonical artifacts. Each node advances when its upstream is
            published.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant={overview.gatedByOpenTasks ? "orange" : "gray"}>
            {overview.openTaskCount}/{overview.wakeThreshold} open tasks
          </Badge>
          {overview.gatedByOpenTasks && (
            <span className="text-muted-foreground">
              Chain gated, clear tasks to resume
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div
          className="relative grid gap-x-10 gap-y-4 pb-2"
          ref={containerRef}
          style={{
            gridTemplateColumns: `repeat(${TREE_COL_COUNT}, minmax(190px, 1fr))`,
            gridTemplateRows: `repeat(${TREE_ROW_COUNT}, minmax(0, auto))`,
            minWidth: `${TREE_COL_COUNT * 200}px`,
          }}
        >
          {meta.nodes.map((nodeMeta) => {
            const node = nodesByKind.get(nodeMeta.kind);
            if (!node) {
              return null;
            }
            // Defense in depth: if backend ever introduces a new chain node
            // before the frontend layout map is updated, skip rendering it
            // instead of crashing the whole page. Surfaces in dev as a
            // console warning so the drift is caught quickly.
            const position = TREE_POSITIONS[nodeMeta.kind];
            if (!position) {
              if (process.env.NODE_ENV !== "production") {
                console.warn(
                  `ChainTechTree: missing TREE_POSITIONS entry for "${nodeMeta.kind}" — skipped`
                );
              }
              return null;
            }
            const owner = isOwner(node.owner) ? node.owner : "cto";
            const isActive = activeWork?.activeNode === nodeMeta.kind;
            return (
              <div
                className="self-center"
                key={nodeMeta.kind}
                style={{
                  gridColumnStart: position.col + 1,
                  gridRowStart: position.row + 1,
                }}
              >
                <ChainTechTreeCard
                  actionable={node.actionable}
                  activeMessage={isActive ? activeWork.message : null}
                  artifactCount={node.artifactCount}
                  avgValidationScore={node.avgValidationScore}
                  draftSubtypes={node.draftSubtypes}
                  isActive={isActive}
                  kind={nodeMeta.kind}
                  label={nodeMeta.label}
                  lastUpdatedAt={node.lastUpdatedAt}
                  onPreview={setPreviewKind}
                  owner={owner}
                  pluralNoun={nodeMeta.plural}
                  recentTitles={node.recentTitles}
                  ref={setCardRef(nodeMeta.kind)}
                  status={node.status}
                />
              </div>
            );
          })}
          <ChainTechTreeConnectors
            containerRef={containerRef}
            edges={meta.edges}
            refMap={refMap}
            variantByTarget={variantByTarget}
          />
        </div>
      </div>

      <ChainNodePreviewDialog
        kind={previewKind}
        label={previewKind ? (metaByKind.get(previewKind)?.label ?? "") : ""}
        onOpenChange={(o) => {
          if (!o) {
            setPreviewKind(null);
          }
        }}
        open={previewKind !== null}
        organizationId={organizationId}
        orgSlug={orgSlug}
        statusLabel={
          previewKind
            ? (nodesByKind.get(previewKind)?.status ?? "missing")
            : "missing"
        }
      />
    </div>
  );
}
