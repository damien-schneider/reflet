"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DayData {
  date: string;
  uptimePercentage: number;
}

interface UptimeBarProps {
  days: DayData[];
  totalDays?: number;
}

const getBarColor = (uptime: number): string => {
  if (uptime >= 99.5) {
    return "bg-emerald-500";
  }
  if (uptime >= 95) {
    return "bg-amber-500";
  }
  return "bg-red-500";
};

export function UptimeBar({ days, totalDays = 90 }: UptimeBarProps) {
  const dayMap = new Map(days.map((d) => [d.date, d]));

  // Generate all days for the range
  const bars: Array<{ date: string; uptime: number | null }> = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const data = dayMap.get(date);
    bars.push({ date, uptime: data?.uptimePercentage ?? null });
  }

  return (
    <div className="flex h-8 w-full items-end gap-px">
      {bars.map((bar) => (
        <Tooltip key={bar.date}>
          <TooltipTrigger asChild>
            <div
              className={`min-w-0.5 flex-1 rounded-sm ${
                bar.uptime === null ? "bg-muted" : getBarColor(bar.uptime)
              }`}
              style={{ height: bar.uptime === null ? "40%" : "100%" }}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium text-xs">{bar.date}</p>
            <p className="text-xs">
              {bar.uptime === null ? "No data" : `${bar.uptime}% uptime`}
            </p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
