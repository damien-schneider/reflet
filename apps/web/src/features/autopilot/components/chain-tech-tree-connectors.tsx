"use client";

import { type RefObject, useEffect, useLayoutEffect, useState } from "react";

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

interface ConnectorEdge {
  from: ChainNodeKind;
  to: ChainNodeKind;
}

interface PathInfo {
  d: string;
  endX: number;
  endY: number;
  highlight: boolean;
  key: string;
}

interface ChainTechTreeConnectorsProps {
  containerRef: RefObject<HTMLElement | null>;
  edges: ConnectorEdge[];
  highlightTargets: Set<ChainNodeKind>;
  refMap: RefObject<Map<ChainNodeKind, HTMLElement>>;
}

const computePaths = (
  container: HTMLElement,
  refMap: Map<ChainNodeKind, HTMLElement>,
  edges: ConnectorEdge[],
  highlightTargets: Set<ChainNodeKind>
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
    const midX = (fromX + toX) / 2;
    const d = `M ${fromX} ${fromY} H ${midX} V ${toY} H ${toX}`;
    result.push({
      key: `${from}->${to}`,
      d,
      endX: toX,
      endY: toY,
      highlight: highlightTargets.has(to),
    });
  }
  return result;
};

export function ChainTechTreeConnectors({
  containerRef,
  refMap,
  edges,
  highlightTargets,
}: ChainTechTreeConnectorsProps) {
  const [paths, setPaths] = useState<PathInfo[]>([]);

  // Recompute on mount, on highlightTargets identity change, and on resize.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const refs = refMap.current;
    if (!refs) {
      return;
    }
    const recompute = () => {
      setPaths(computePaths(container, refs, edges, highlightTargets));
    };
    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(container);
    for (const el of refs.values()) {
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, [containerRef, refMap, edges, highlightTargets]);

  // Also redraw on window resize for safety (font scaling, devtools, etc.).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const refs = refMap.current;
    if (!refs) {
      return;
    }
    const onResize = () => {
      setPaths(computePaths(container, refs, edges, highlightTargets));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [containerRef, refMap, edges, highlightTargets]);

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      role="presentation"
    >
      <title>Chain dependency graph</title>
      {paths.map((p) => (
        <g key={p.key}>
          <path
            d={p.d}
            fill="none"
            stroke={
              p.highlight ? "var(--color-amber-500, #f59e0b)" : "var(--border)"
            }
            strokeDasharray="2.25 3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={p.highlight ? 1.5 : 1}
          />
          <circle
            cx={p.endX}
            cy={p.endY}
            fill="var(--background)"
            r={2.5}
            stroke={
              p.highlight ? "var(--color-amber-500, #f59e0b)" : "var(--border)"
            }
          />
        </g>
      ))}
    </svg>
  );
}
