"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { IconChartBar, IconSearch } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { H2 } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import {
  REPORT_TYPE_COLORS,
  REPORT_TYPE_LABELS,
  ReportSheet,
} from "@/features/autopilot/components/report-sheet";
import { cn } from "@/lib/utils";

type ReportTypeFilter = "all" | "daily" | "weekly" | "on_demand";

const REPORT_TYPE_FILTERS: readonly ReportTypeFilter[] = [
  "all",
  "daily",
  "weekly",
  "on_demand",
];

function isReportTypeFilter(value: string | null): value is ReportTypeFilter {
  if (!value) {
    return false;
  }
  return REPORT_TYPE_FILTERS.some((filter) => filter === value);
}

function getHealthColor(score: number): string {
  if (score >= 70) {
    return "bg-green-500";
  }
  if (score >= 40) {
    return "bg-amber-500";
  }
  return "bg-red-500";
}

export default function ReportsPage() {
  const { organizationId } = useAutopilotContext();

  const reports = useQuery(api.autopilot.queries.reports.listReports, {
    organizationId,
    limit: 100,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<ReportTypeFilter>("all");
  const [selectedReportId, setSelectedReportId] =
    useState<Id<"autopilotReports"> | null>(null);
  const hasActiveFilters = searchQuery !== "" || filterType !== "all";

  if (reports === undefined) {
    return (
      <div className="space-y-4">
        <H2 variant="card">Reports</H2>
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton className="h-28 rounded-xl" key={`skel-${String(i)}`} />
          ))}
        </div>
      </div>
    );
  }

  const filteredReports = reports.filter((report) => {
    if (
      searchQuery &&
      !report.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !report.executiveSummary.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (filterType !== "all" && report.reportType !== filterType) {
      return false;
    }
    return true;
  });

  const selectedReport =
    reports.find((r) => r._id === selectedReportId) ?? null;

  const handleSheetOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedReportId(null);
    }
  };

  return (
    <div className="space-y-4">
      <H2 variant="card">Reports</H2>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <IconSearch className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports..."
            value={searchQuery}
          />
        </div>

        <Select
          onValueChange={(v) => {
            if (isReportTypeFilter(v)) {
              setFilterType(v);
            }
          }}
          value={filterType}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="on_demand">On Demand</SelectItem>
          </SelectContent>
        </Select>

        <span className="ml-auto text-muted-foreground text-sm">
          {filteredReports.length} report
          {filteredReports.length === 1 ? "" : "s"}
        </span>
      </div>

      {filteredReports.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed text-muted-foreground text-sm">
          <div className="text-center">
            <IconChartBar className="mx-auto mb-2 size-8" />
            <p className="font-medium">
              {hasActiveFilters ? "No reports match" : "No reports yet"}
            </p>
            <p className="mt-1 text-xs">
              {hasActiveFilters
                ? "Clear filters to review the full report history."
                : "Reports are generated automatically by the system."}
            </p>
            {hasActiveFilters && (
              <Button
                className="mt-3"
                onClick={() => {
                  setSearchQuery("");
                  setFilterType("all");
                }}
                size="sm"
                variant="outline"
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredReports.map((report) => (
            <Button
              className={cn(
                "group h-auto w-full justify-start whitespace-normal rounded-xl border bg-card p-4 text-left hover:bg-accent/50",
                selectedReportId === report._id && "border-primary/50 bg-muted"
              )}
              key={report._id}
              onClick={() => setSelectedReportId(report._id)}
              type="button"
              variant="ghost"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex size-7 shrink-0 items-center justify-center rounded-full font-bold text-white text-xs",
                      getHealthColor(report.healthScore)
                    )}
                    title={`Health score: ${report.healthScore}/100`}
                  >
                    {report.healthScore}
                  </span>
                  <Badge
                    className="shrink-0"
                    color={REPORT_TYPE_COLORS[report.reportType]}
                  >
                    {REPORT_TYPE_LABELS[report.reportType]}
                  </Badge>
                  <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                    {formatDistanceToNow(report.createdAt, { addSuffix: true })}
                  </span>
                  {report.needsReview && (
                    <span className="size-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </div>
                <p className="mb-1 font-medium text-sm leading-snug">
                  {report.title}
                </p>
                <p className="line-clamp-2 text-muted-foreground text-xs leading-relaxed">
                  {report.executiveSummary}
                </p>
              </div>
            </Button>
          ))}
        </div>
      )}

      <ReportSheet
        onOpenChange={handleSheetOpenChange}
        open={selectedReportId !== null}
        report={selectedReport}
      />
    </div>
  );
}
