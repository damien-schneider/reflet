"use client";

type StatusType =
  | "operational"
  | "degraded"
  | "major_outage"
  | "paused"
  | "no_monitors";

interface StatusDotProps {
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
  status: StatusType;
}

const colorMap: Record<StatusType, string> = {
  degraded: "bg-warning",
  major_outage: "bg-destructive",
  no_monitors: "bg-muted-foreground/40",
  operational: "bg-success",
  paused: "bg-muted-foreground",
};

const sizeMap = {
  lg: "h-3 w-3",
  md: "h-2.5 w-2.5",
  sm: "h-2 w-2",
};

export function StatusDot({
  status,
  size = "md",
  pulse = false,
}: StatusDotProps) {
  return (
    <span className="relative inline-flex">
      <span
        className={`inline-block rounded-full ${colorMap[status]} ${sizeMap[size]}`}
      />
      {pulse && status !== "operational" && status !== "paused" && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${colorMap[status]}`}
        />
      )}
    </span>
  );
}
