"use client";

import { type RefObject, useEffect, useLayoutEffect, useState } from "react";

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

interface ConnectorEdge {
  from: ChainNodeKind;
  to: ChainNodeKind;
}

interface PathInfo {
  d: string;
  endX: number;
  endY: number;
  key: string;
  variant: EdgeVariant;
}

export type EdgeVariant = "done" | "active" | "available" | "locked";

interface ChainTechTreeConnectorsProps {
  containerRef: RefObject<HTMLElement | null>;
  edges: ConnectorEdge[];
  refMap: RefObject<Map<ChainNodeKind, HTMLElement>>;
  variantByTarget: Record<ChainNodeKind, EdgeVariant>;
}

const STROKE_CLASS_BY_VARIANT: Record<EdgeVariant, string> = {
  done: "stroke-emerald-500",
  active: "stroke-emerald-500",
  available: "stroke-primary",
  locked: "stroke-border",
};

const WIDTH_BY_VARIANT: Record<EdgeVariant, number> = {
  done: 1.5,
  active: 2,
  available: 2,
  locked: 1,
};

const computePaths = (
  container: HTMLElement,
  refMap: Map<ChainNodeKind, HTMLElement>,
  edges: ConnectorEdge[],
  variantByTarget: Record<ChainNodeKind, EdgeVariant>
): PathInfo[] => {
  const containerRect = container.getBoundingClientRect();
  const result: PathInfo[] = [];
  for (const { from, to } of edges) {
    const fromEl = refMap.get(from);
    const toEl = refMap.get(to);
    if (!(fromEl && toEl)) {
      continue;
    }
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const fromX = fromRect.right - containerRect.left;
    const fromY = fromRect.top + fromRect.height / 2 - containerRect.top;
    const toX = toRect.left - containerRect.left;
    const toY = toRect.top + toRect.height / 2 - containerRect.top;
    const dx = toX - fromX;
    const c1X = fromX + dx * 0.55;
    const c2X = toX - dx * 0.55;
    const d = `M ${fromX} ${fromY} C ${c1X} ${fromY}, ${c2X} ${toY}, ${toX} ${toY}`;
    result.push({
      key: `${from}->${to}`,
      d,
      endX: toX,
      endY: toY,
      variant: variantByTarget[to],
    });
  }
  return result;
};

export function ChainTechTreeConnectors({
  containerRef,
  refMap,
  edges,
  variantByTarget,
}: ChainTechTreeConnectorsProps) {
  const [paths, setPaths] = useState<PathInfo[]>([]);

  useLayoutEffect(
    function syncConnectorPaths() {
      const container = containerRef.current;
      if (!container) {
        return;
      }
      const refs = refMap.current;
      if (!refs) {
        return;
      }
      const recompute = () => {
        setPaths(computePaths(container, refs, edges, variantByTarget));
      };
      recompute();
      const observer = new ResizeObserver(recompute);
      observer.observe(container);
      for (const el of refs.values()) {
        observer.observe(el);
      }
      return () => observer.disconnect();
    },
    [containerRef, refMap, edges, variantByTarget]
  );

  useEffect(
    function syncConnectorPathsOnResize() {
      const container = containerRef.current;
      if (!container) {
        return;
      }
      const refs = refMap.current;
      if (!refs) {
        return;
      }
      const onResize = () => {
        setPaths(computePaths(container, refs, edges, variantByTarget));
      };
      window.addEventListener("resize", onResize, { passive: true });
      return () => window.removeEventListener("resize", onResize);
    },
    [containerRef, refMap, edges, variantByTarget]
  );

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      role="presentation"
    >
      <title>Chain dependency graph</title>
      {paths.map((p) => {
        const strokeClass = STROKE_CLASS_BY_VARIANT[p.variant];
        return (
          <g
            className={p.variant === "locked" ? "opacity-55" : undefined}
            key={p.key}
          >
            <path
              className={strokeClass}
              d={p.d}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={WIDTH_BY_VARIANT[p.variant]}
            />
            <circle
              className={`${strokeClass} fill-background`}
              cx={p.endX}
              cy={p.endY}
              r={3}
              strokeWidth={WIDTH_BY_VARIANT[p.variant]}
            />
          </g>
        );
      })}
    </svg>
  );
}
