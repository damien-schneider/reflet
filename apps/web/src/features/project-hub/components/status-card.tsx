import { Heartbeat } from "@phosphor-icons/react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Muted, Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

const STATUS_LABELS = {
  operational: "All systems operational",
  degraded: "Degraded performance",
  major_outage: "Major outage",
  no_monitors: "No monitors",
} as const;

const STATUS_COLORS = {
  operational: "bg-emerald-500",
  degraded: "bg-amber-500",
  major_outage: "bg-red-500",
  no_monitors: "bg-muted-foreground",
} as const;

interface StatusCardProps {
  aggregateStatus:
    | {
        monitorCount: number;
        status: keyof typeof STATUS_LABELS;
      }
    | null
    | undefined;
  basePath: string;
}

export function StatusCard({ aggregateStatus, basePath }: StatusCardProps) {
  return (
    <Link href={`${basePath}/status`}>
      <Card className="h-full transition-colors hover:bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Heartbeat className="size-4" />
            Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {aggregateStatus ? (
            <>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    STATUS_COLORS[aggregateStatus.status]
                  )}
                />
                <Text className="font-medium" variant="bodySmall">
                  {STATUS_LABELS[aggregateStatus.status]}
                </Text>
              </div>
              <Muted className="mt-1 text-xs">
                {aggregateStatus.monitorCount} monitor
                {aggregateStatus.monitorCount === 1 ? "" : "s"}
              </Muted>
            </>
          ) : (
            <Muted className="text-xs">Loading...</Muted>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
