"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import {
  IconAlertTriangle,
  IconBug,
  IconRefresh,
  IconShield,
  IconShieldCheck,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { H2 } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES = {
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  info: "bg-muted text-muted-foreground",
} as const;

const STATUS_STYLES = {
  open: "bg-red-500/10 text-red-500",
  fixing: "bg-yellow-500/10 text-yellow-500",
  fixed: "bg-green-500/10 text-green-500",
  dismissed: "bg-muted text-muted-foreground",
} as const;

export default function SecurityDashboardPage() {
  const { organizationId } = useAutopilotContext();

  const stats = useQuery(api.autopilot.security_queries.getSecurityStats, {
    organizationId,
  });

  const findings = useQuery(
    api.autopilot.security_queries.listSecurityFindings,
    { organizationId, limit: 50 }
  );

  if (stats === undefined || findings === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton className="h-24 rounded-lg" key={`stat-${String(i)}`} />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <H2 variant="card">Security Dashboard</H2>
        <Button size="sm" variant="outline">
          <IconRefresh className="mr-1.5 size-4" />
          Run Scan Now
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open Issues</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl">{stats.openCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Fixed</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl text-green-500">
              {stats.fixedCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Critical</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl text-red-500">
              {stats.bySeverity.critical}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Last Scan</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {stats.lastScanDate
                ? formatDistanceToNow(stats.lastScanDate, { addSuffix: true })
                : "Never"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Severity Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <IconShield className="size-5" />
            Severity Breakdown (Open)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {(Object.entries(stats.bySeverity) as [string, number][]).map(
              ([severity, count]) => (
                <div
                  className={cn(
                    "flex-1 rounded-lg border p-3 text-center",
                    SEVERITY_STYLES[severity as keyof typeof SEVERITY_STYLES]
                  )}
                  key={severity}
                >
                  <p className="font-bold text-lg">{count}</p>
                  <p className="text-xs capitalize">{severity}</p>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Findings List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <IconBug className="size-5" />
            Findings ({findings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {findings.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-center">
              <div>
                <IconShieldCheck className="mx-auto mb-2 size-8 text-green-500" />
                <p className="text-muted-foreground text-sm">
                  No security findings. Your codebase looks clean!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {findings.map((finding) => (
                <div
                  className="flex items-start gap-3 rounded-lg border p-3"
                  key={finding._id}
                >
                  <IconAlertTriangle
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      finding.severity === "critical" && "text-red-500",
                      finding.severity === "high" && "text-orange-500",
                      finding.severity === "medium" && "text-yellow-500",
                      finding.severity === "low" && "text-blue-500"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {finding.title}
                      </span>
                      <Badge
                        className={cn(
                          "text-xs",
                          SEVERITY_STYLES[
                            finding.severity as keyof typeof SEVERITY_STYLES
                          ]
                        )}
                        variant="outline"
                      >
                        {finding.severity}
                      </Badge>
                      <Badge
                        className={cn(
                          "text-xs",
                          STATUS_STYLES[
                            finding.status as keyof typeof STATUS_STYLES
                          ]
                        )}
                        variant="outline"
                      >
                        {finding.status}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
                      {finding.description}
                    </p>
                    {finding.filePath && (
                      <p className="mt-1 font-mono text-muted-foreground text-xs">
                        {finding.filePath}
                        {finding.lineNumber ? `:${finding.lineNumber}` : ""}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-muted-foreground text-xs">
                    {formatDistanceToNow(finding.createdAt, {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
