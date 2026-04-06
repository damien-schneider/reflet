"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { IconArrowDown, IconArrowUp, IconMinus } from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AGENT_LABELS } from "@/features/autopilot/lib/document-labels";
import { cn } from "@/lib/utils";

type Report = Doc<"autopilotReports">;

const REPORT_TYPE_LABELS: Record<Report["reportType"], string> = {
  daily: "Daily",
  weekly: "Weekly",
  on_demand: "On Demand",
};

const REPORT_TYPE_COLORS: Record<Report["reportType"], string> = {
  daily: "blue",
  weekly: "purple",
  on_demand: "orange",
};

const TREND_ICONS = {
  up: IconArrowUp,
  down: IconArrowDown,
  stable: IconMinus,
} as const;

const TREND_COLORS = {
  up: "text-green-500",
  down: "text-red-500",
  stable: "text-muted-foreground",
} as const;

const REC_PRIORITY_STYLES = {
  critical: "border-red-500/30 bg-red-500/5",
  high: "border-orange-500/30 bg-orange-500/5",
  medium: "border-yellow-500/30 bg-yellow-500/5",
  low: "border-border bg-muted/30",
} as const;

const REC_PRIORITY_BADGE = {
  critical: "bg-red-500/10 text-red-500 border-red-500/30",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  low: "bg-muted text-muted-foreground border-border",
} as const;

function HealthScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  let color = "stroke-red-500";
  if (score >= 70) {
    color = "stroke-green-500";
  } else if (score >= 40) {
    color = "stroke-amber-500";
  }

  return (
    <div className="flex items-center gap-3">
      <svg
        aria-label={`Health score: ${score} out of 100`}
        className="size-20"
        role="img"
        viewBox="0 0 80 80"
      >
        <circle
          className="stroke-muted"
          cx="40"
          cy="40"
          fill="none"
          r={radius}
          strokeWidth="6"
        />
        <circle
          className={cn("transition-all duration-500", color)}
          cx="40"
          cy="40"
          fill="none"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth="6"
          transform="rotate(-90 40 40)"
        />
        <text
          className="fill-foreground font-bold text-lg"
          dominantBaseline="central"
          textAnchor="middle"
          x="40"
          y="40"
        >
          {score}
        </text>
      </svg>
      <div>
        <p className="font-medium text-sm">Health Score</p>
        <p className="text-muted-foreground text-xs">out of 100</p>
      </div>
    </div>
  );
}

function ReportPropertyRow({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-24 shrink-0 text-muted-foreground text-xs">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">{children}</div>
    </div>
  );
}

function ReportPropertyGrid({ report }: { report: Report }) {
  return (
    <div className="text-sm">
      <ReportPropertyRow label="Type">
        <Badge color={REPORT_TYPE_COLORS[report.reportType]}>
          {REPORT_TYPE_LABELS[report.reportType]}
        </Badge>
      </ReportPropertyRow>

      {report.sourceAgent && (
        <ReportPropertyRow label="Agent">
          <Badge variant="secondary">
            {AGENT_LABELS[report.sourceAgent] ?? report.sourceAgent}
          </Badge>
        </ReportPropertyRow>
      )}

      {report.tags.length > 0 && (
        <ReportPropertyRow label="Tags">
          <div className="flex flex-wrap gap-1">
            {report.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </ReportPropertyRow>
      )}

      <ReportPropertyRow label="Created">
        <span className="text-muted-foreground text-xs">
          {formatDistanceToNow(report.createdAt, { addSuffix: true })}
        </span>
      </ReportPropertyRow>
    </div>
  );
}

function ReportBody({ report }: { report: Report }) {
  return (
    <div className="space-y-6">
      {/* Health Score + Executive Summary */}
      <div className="rounded-lg border bg-muted/20 p-4">
        <div className="flex items-start gap-4">
          <HealthScoreRing score={report.healthScore} />
          <div className="min-w-0 flex-1">
            <h4 className="mb-1 font-medium text-sm">Executive Summary</h4>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {report.executiveSummary}
            </p>
          </div>
        </div>
      </div>

      {/* Sections */}
      {report.sections.map((section) => (
        <div key={section.heading}>
          <h4 className="mb-2 font-semibold text-sm">{section.heading}</h4>
          <p className="mb-3 text-muted-foreground text-sm leading-relaxed">
            {section.content}
          </p>
          {section.metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {section.metrics.map((metric) => {
                const TrendIcon = TREND_ICONS[metric.trend];
                return (
                  <div
                    className="rounded-md border bg-card p-2.5"
                    key={metric.label}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {metric.label}
                      </span>
                      <TrendIcon
                        className={cn("size-3", TREND_COLORS[metric.trend])}
                      />
                    </div>
                    <p className="mt-0.5 font-semibold text-sm">
                      {metric.value}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div>
          <h4 className="mb-2 font-semibold text-sm">Recommendations</h4>
          <div className="space-y-2">
            {report.recommendations.map((rec) => (
              <div
                className={cn(
                  "rounded-md border p-3",
                  REC_PRIORITY_STYLES[rec.priority]
                )}
                key={rec.title}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{rec.title}</span>
                  <Badge
                    className={cn(
                      "text-[10px]",
                      REC_PRIORITY_BADGE[rec.priority]
                    )}
                    variant="outline"
                  >
                    {rec.priority}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground text-xs">
                  {rec.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ReportSheetProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  report: Report | null;
}

export function ReportSheet({ onOpenChange, open, report }: ReportSheetProps) {
  const archiveReport = useMutation(
    api.autopilot.mutations.reports.archiveReport
  );
  const acknowledgeReport = useMutation(
    api.autopilot.mutations.reports.acknowledgeReport
  );

  const handleArchive = async () => {
    if (!report) {
      return;
    }
    try {
      await archiveReport({ reportId: report._id });
      toast.success("Report archived");
      onOpenChange(false);
    } catch {
      toast.error("Failed to archive report");
    }
  };

  const handleAcknowledge = async () => {
    if (!report) {
      return;
    }
    try {
      await acknowledgeReport({ reportId: report._id });
      toast.success("Report acknowledged");
    } catch {
      toast.error("Failed to acknowledge report");
    }
  };

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="md:w-[50vw] md:max-w-2xl"
        side="right"
        variant="panel"
      >
        {report ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <Badge color={REPORT_TYPE_COLORS[report.reportType]}>
                  {REPORT_TYPE_LABELS[report.reportType]}
                </Badge>
                {report.needsReview && (
                  <Badge color="yellow" variant="outline">
                    Needs Review
                  </Badge>
                )}
                <span className="text-muted-foreground text-xs">
                  {formatDistanceToNow(report.createdAt, { addSuffix: true })}
                </span>
              </div>
              <SheetTitle>{report.title}</SheetTitle>
              <SheetDescription className="sr-only">
                Report details
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1" classNameViewport="px-4">
              <ReportPropertyGrid report={report} />
              <div className="my-4 border-t" />
              <ReportBody report={report} />
            </ScrollArea>
            <SheetFooter className="flex-row justify-between gap-2">
              <Button onClick={handleArchive} variant="outline">
                Archive
              </Button>
              {report.needsReview && (
                <Button onClick={handleAcknowledge}>Acknowledge</Button>
              )}
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export type { Report };
export { REPORT_TYPE_COLORS, REPORT_TYPE_LABELS };

// Small inline health score indicator for list views
function getHealthColor(score: number): string {
  if (score >= 70) {
    return "bg-green-500";
  }
  if (score >= 40) {
    return "bg-amber-500";
  }
  return "bg-red-500";
}

export function HealthScoreIndicator({
  reportId: _reportId,
  score,
}: {
  reportId: Id<"autopilotReports">;
  score: number;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-full font-bold text-white text-xs",
        getHealthColor(score)
      )}
      title={`Health score: ${score}/100`}
    >
      {score}
    </span>
  );
}
