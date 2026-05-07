"use client";

const ACTIVE_WINDOW = 5 * 60 * 1000;
const RECENT_WINDOW = 30 * 60 * 1000;

export type AgentStatus = "active" | "blocked" | "error" | "idle" | "disabled";

export function getAgentStatus(
  enabled: boolean,
  last: { level: string; createdAt: number } | undefined,
  blocked: boolean
): AgentStatus {
  if (!enabled) {
    return "disabled";
  }
  if (blocked) {
    return "blocked";
  }
  const timeSince = last ? Date.now() - last.createdAt : null;
  const hasError = last?.level === "error";
  const isRecent = timeSince !== null && timeSince < RECENT_WINDOW;
  const isActiveNow = timeSince !== null && timeSince < ACTIVE_WINDOW;

  if (hasError && isRecent) {
    return "error";
  }
  if (isActiveNow) {
    return "active";
  }
  return "idle";
}

const STATUS_RING_STYLES: Record<AgentStatus, string> = {
  active: "stroke-emerald-400",
  blocked: "stroke-amber-400",
  error: "stroke-red-400",
  idle: "stroke-muted-foreground/20",
  disabled: "stroke-muted-foreground/10",
};

function getFillRatio(status: AgentStatus) {
  if (status === "disabled") {
    return 0;
  }
  if (status === "idle") {
    return 0.25;
  }
  return 1;
}

export function StatusRing({
  status,
  size = 32,
}: {
  status: AgentStatus;
  size?: number;
}) {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillRatio = getFillRatio(status);

  return (
    <svg
      aria-hidden="true"
      className="shrink-0 -rotate-90"
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
    >
      <circle
        className="stroke-muted-foreground/[0.06]"
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={radius}
        strokeWidth={2}
      />
      <circle
        className={STATUS_RING_STYLES[status]}
        cx={size / 2}
        cy={size / 2}
        fill="none"
        opacity={status === "disabled" ? 0.3 : 1}
        r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={circumference - fillRatio * circumference}
        strokeLinecap="round"
        strokeWidth={2}
      />
      {status === "active" ? (
        <circle
          className="animate-pulse stroke-emerald-400 motion-reduce:animate-none"
          cx={size / 2}
          cy={size / 2}
          fill="none"
          opacity={0.35}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - fillRatio * circumference}
          strokeLinecap="round"
          strokeWidth={2}
        />
      ) : null}
    </svg>
  );
}
