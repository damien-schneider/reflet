import { useId } from "react";
import { DIAL_RING_WIDTH, DIAL_SIZE } from "./dial-geometry";

const NON_ID_CHARACTERS = /[^a-zA-Z0-9_-]/g;

export function useSvgId(): string {
  return useId().replace(NON_ID_CHARACTERS, "");
}

function DialSurfaceDefs({ fill, lit }: { fill: string; lit: string }) {
  return (
    <defs>
      <linearGradient
        gradientUnits="userSpaceOnUse"
        id={fill}
        x1={0}
        x2={0}
        y1={0}
        y2={DIAL_SIZE}
      >
        <stop
          offset={0}
          style={{ stopColor: "var(--live-dial-surface-top)" }}
        />
        <stop
          offset={1}
          style={{ stopColor: "var(--live-dial-surface-bottom)" }}
        />
      </linearGradient>
      <filter
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
        height={DIAL_SIZE}
        id={lit}
        width={DIAL_SIZE}
        x={0}
        y={0}
      >
        <feOffset dy={1} in="SourceAlpha" result="down" />
        <feComposite in="SourceAlpha" in2="down" operator="out" result="top" />
        <feFlood style={{ floodColor: "var(--live-dial-surface-rim)" }} />
        <feComposite in2="top" operator="in" result="rim" />
        <feOffset dy={-2} in="SourceAlpha" result="up" />
        <feGaussianBlur in="up" result="soft-up" stdDeviation={1.5} />
        <feComposite
          in="SourceAlpha"
          in2="soft-up"
          operator="out"
          result="bottom"
        />
        <feFlood style={{ floodColor: "var(--live-dial-surface-shade)" }} />
        <feComposite in2="bottom" operator="in" result="shade" />
        <feMerge>
          <feMergeNode in="SourceGraphic" />
          <feMergeNode in="shade" />
          <feMergeNode in="rim" />
        </feMerge>
      </filter>
    </defs>
  );
}

export function DialTracks({
  dividers,
  tracks,
}: {
  dividers: readonly string[];
  tracks: readonly string[];
}) {
  const id = useSvgId();
  const fill = `live-dial-${id}-fill`;
  const lit = `live-dial-${id}-lit`;
  return (
    <svg
      aria-hidden="true"
      className="live-dial-raised pointer-events-none absolute inset-0 size-full overflow-visible"
      viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}
    >
      <DialSurfaceDefs fill={fill} lit={lit} />
      {tracks.map((track) => (
        <path
          className="stroke-(--live-dial-outline)"
          d={track}
          fill="none"
          key={`outline ${track}`}
          strokeLinecap="round"
          strokeWidth={DIAL_RING_WIDTH + 1}
        />
      ))}
      <g filter={`url(#${lit})`}>
        {tracks.map((track) => (
          <path
            d={track}
            fill="none"
            key={`ring ${track}`}
            stroke={`url(#${fill})`}
            strokeLinecap="round"
            strokeWidth={DIAL_RING_WIDTH}
          />
        ))}
      </g>
      {dividers.map((divider) => (
        <path
          className="stroke-(--live-dial-divider)"
          d={divider}
          key={divider}
          strokeLinecap="round"
          strokeWidth={1}
        />
      ))}
    </svg>
  );
}
