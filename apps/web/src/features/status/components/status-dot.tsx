"use client";

import { cn } from "@/lib/utils";

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
  operational: "bg-emerald-500",
  degraded: "bg-amber-500",
  major_outage: "bg-red-500",
  paused: "bg-gray-400",
  no_monitors: "bg-gray-300",
};

const sizeMap = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
};

export function StatusDot({
  status,
  size = "md",
  pulse = false,
}: StatusDotProps) {
  return (
    <span className="relative inline-flex">
      <span
        className={cn(
          "inline-block rounded-full",
          colorMap[status],
          sizeMap[size]
        )}
      />
      {pulse && status !== "operational" && status !== "paused" && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            colorMap[status]
          )}
        />
      )}
    </span>
  );
}
