"use client";

import "@xyflow/react/dist/style.css";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { chainNodeStatus } from "@reflet/backend/convex/autopilot/schema/validators";
import {
  Background,
  type Edge,
  Handle,
  MarkerType,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
} from "@xyflow/react";
import { useQuery } from "convex/react";
import type { Infer } from "convex/values";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";

import { ChainNodePreviewDialog } from "./chain-node-preview-dialog";
import { ChainTechTreeCard } from "./chain-tech-tree-card";

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
type EdgeVariant = "done" | "active" | "available" | "locked";
type ChainNodeStatus = Infer<typeof chainNodeStatus>;

const isOwner = (s: string): s is Owner =>
  s === "cto" || s === "pm" || s === "growth" || s === "sales";

interface NodePosition {
  col: number;
  row: number;
}

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

const NODE_WIDTH = 220;
const COL_GAP = 60;
const ROW_GAP = 40;
const NODE_HEIGHT = 150;
const COL_SPACING = NODE_WIDTH + COL_GAP;
const ROW_SPACING = NODE_HEIGHT + ROW_GAP;

const EDGE_STROKE_BY_VARIANT: Record<EdgeVariant, string> = {
  done: "var(--color-emerald-500)",
  active: "var(--color-emerald-500)",
  available: "var(--color-primary)",
  locked: "color-mix(in oklab, var(--color-muted-foreground) 55%, transparent)",
};

const EDGE_WIDTH_BY_VARIANT: Record<EdgeVariant, number> = {
  done: 2,
  active: 2.5,
  available: 2.5,
  locked: 1.5,
};

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

interface ChainNodeData extends Record<string, unknown> {
  cardProps: Parameters<typeof ChainTechTreeCard>[0];
}

type ChainFlowNode = Node<ChainNodeData, "chain">;

function ChainFlowNodeComponent({ data }: NodeProps<ChainFlowNode>) {
  return (
    <div style={{ width: NODE_WIDTH }}>
      <Handle
        className="!border-0 !bg-transparent !opacity-0"
        isConnectable={false}
        position={Position.Left}
        type="target"
      />
      <ChainTechTreeCard {...data.cardProps} />
      <Handle
        className="!border-0 !bg-transparent !opacity-0"
        isConnectable={false}
        position={Position.Right}
        type="source"
      />
    </div>
  );
}

const NODE_TYPES = { chain: ChainFlowNodeComponent } as const;
const PRO_OPTIONS = { hideAttribution: true } as const;
const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 } as const;

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
  const [hoveredKind, setHoveredKind] = useState<ChainNodeKind | null>(null);

  const handleHover = useCallback((kind: ChainNodeKind | null) => {
    setHoveredKind(kind);
  }, []);

  const nodesByKind = useMemo(() => {
    if (!overview) {
      return null;
    }
    const map = new Map<ChainNodeKind, (typeof overview.nodes)[number]>();
    for (const n of overview.nodes) {
      map.set(n.kind, n);
    }
    return map;
  }, [overview]);

  const metaByKind = useMemo(() => {
    if (!meta) {
      return null;
    }
    return new Map(meta.nodes.map((n) => [n.kind, n]));
  }, [meta]);

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

  const adjacency = useMemo(() => {
    const parents = new Map<ChainNodeKind, ChainNodeKind[]>();
    const children = new Map<ChainNodeKind, ChainNodeKind[]>();
    if (!meta) {
      return { children, parents };
    }
    for (const m of meta.nodes) {
      parents.set(m.kind, m.deps);
    }
    for (const edge of meta.edges) {
      const arr = children.get(edge.from);
      if (arr) {
        arr.push(edge.to);
      } else {
        children.set(edge.from, [edge.to]);
      }
    }
    return { children, parents };
  }, [meta]);

  const highlightedKinds = useMemo<Set<ChainNodeKind> | null>(() => {
    if (!hoveredKind) {
      return null;
    }
    const set = new Set<ChainNodeKind>([hoveredKind]);
    const walk = (neighbors: Map<ChainNodeKind, ChainNodeKind[]>) => {
      const queue: ChainNodeKind[] = [hoveredKind];
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) {
          break;
        }
        for (const next of neighbors.get(current) ?? []) {
          if (!set.has(next)) {
            set.add(next);
            queue.push(next);
          }
        }
      }
    };
    walk(adjacency.parents);
    walk(adjacency.children);
    return set;
  }, [hoveredKind, adjacency]);

  const flowNodes = useMemo<ChainFlowNode[]>(() => {
    if (!(meta && nodesByKind && metaByKind)) {
      return [];
    }
    const result: ChainFlowNode[] = [];
    for (const nodeMeta of meta.nodes) {
      const node = nodesByKind.get(nodeMeta.kind);
      const position = TREE_POSITIONS[nodeMeta.kind];
      if (!(node && position)) {
        continue;
      }
      const owner = isOwner(node.owner) ? node.owner : "cto";
      const isActive = activeWork?.activeNode === nodeMeta.kind;
      const blockerLabels = nodeMeta.deps
        .filter((dep) => {
          const parent = nodesByKind.get(dep);
          return !parent || parent.status !== "published";
        })
        .map((dep) => metaByKind.get(dep)?.label ?? dep.replaceAll("_", " "));
      const dimmed = highlightedKinds
        ? !highlightedKinds.has(nodeMeta.kind)
        : false;
      result.push({
        id: nodeMeta.kind,
        type: "chain",
        position: {
          x: position.col * COL_SPACING,
          y: position.row * ROW_SPACING,
        },
        data: {
          cardProps: {
            actionable: node.actionable,
            activeMessage: isActive ? activeWork.message : null,
            artifactCount: node.artifactCount,
            avgValidationScore: node.avgValidationScore,
            blockerLabels,
            dimmed,
            draftSubtypes: node.draftSubtypes,
            isActive,
            kind: nodeMeta.kind,
            label: nodeMeta.label,
            lastUpdatedAt: node.lastUpdatedAt,
            onHover: handleHover,
            onPreview: setPreviewKind,
            owner,
            pluralNoun: nodeMeta.plural,
            recentTitles: node.recentTitles,
            status: node.status,
          },
        },
        draggable: false,
        selectable: false,
        connectable: false,
      });
    }
    return result;
  }, [
    meta,
    nodesByKind,
    metaByKind,
    activeWork,
    highlightedKinds,
    handleHover,
  ]);

  const flowEdges = useMemo<Edge[]>(() => {
    if (!(meta && variantByTarget)) {
      return [];
    }
    return meta.edges.map((edge) => {
      const variant = variantByTarget[edge.to];
      const stroke = EDGE_STROKE_BY_VARIANT[variant];
      const strokeWidth = EDGE_WIDTH_BY_VARIANT[variant];
      const inHighlight =
        !highlightedKinds ||
        (highlightedKinds.has(edge.from) && highlightedKinds.has(edge.to));
      const opacity = highlightedKinds && !inHighlight ? 0.15 : 1;
      return {
        id: `${edge.from}->${edge.to}`,
        source: edge.from,
        target: edge.to,
        type: "smoothstep",
        animated: variant === "active",
        style: {
          stroke,
          strokeWidth:
            strokeWidth * (inHighlight && highlightedKinds ? 1.4 : 1),
          strokeDasharray: variant === "locked" ? "5 4" : undefined,
          opacity,
          transition: "opacity 150ms ease, stroke-width 150ms ease",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: stroke,
          width: 18,
          height: 18,
        },
      };
    });
  }, [meta, variantByTarget, highlightedKinds]);

  if (!(overview && nodesByKind && meta && metaByKind && variantByTarget)) {
    return (
      <div className="space-y-3">
        <div className="h-7 w-48 animate-pulse rounded bg-muted" />
        <div className="h-[520px] animate-pulse rounded-xl bg-muted/40" />
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

      <div className="h-[560px] w-full overflow-hidden rounded-xl border bg-muted/10">
        <ReactFlow
          defaultViewport={DEFAULT_VIEWPORT}
          edges={flowEdges}
          edgesFocusable={false}
          fitView
          fitViewOptions={{ padding: 0.15, minZoom: 0.5, maxZoom: 1.1 }}
          maxZoom={1.5}
          minZoom={0.3}
          nodes={flowNodes}
          nodesConnectable={false}
          nodesDraggable={false}
          nodesFocusable={false}
          nodeTypes={NODE_TYPES}
          panOnScroll
          proOptions={PRO_OPTIONS}
          zoomOnDoubleClick={false}
        >
          <Background gap={24} size={1} />
        </ReactFlow>
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
