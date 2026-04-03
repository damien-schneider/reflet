"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconCheck,
  IconClock,
  IconExternalLink,
  IconX,
} from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TYPE_LABELS = {
  analytics_anomaly: "Anomaly",
  analytics_brief: "Analytics Brief",
  analytics_insight: "Insight",
  architect_finding: "Architecture",
  ceo_report: "CEO Report",
  docs_stale: "Stale Docs",
  docs_update: "Docs Update",
  email_draft: "Email Draft",
  email_received: "Email",
  growth_post: "Growth",
  ops_deploy_failure: "Deploy Failure",
  ops_error_spike: "Error Spike",
  ops_reliability_report: "Reliability",
  ops_rollback: "Rollback",
  pr_review: "PR Review",
  qa_regression: "Regression",
  qa_test_ready: "QA Test",
  revenue_alert: "Revenue",
  security_alert: "Security",
  shipped_notification: "Shipped",
  support_escalation: "Escalation",
  support_reply: "Support Reply",
  task_approval: "Task",
} as const;

const PRIORITY_STYLES = {
  critical: "bg-red-500/10 text-red-500 border-red-500/30",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  low: "bg-muted text-muted-foreground border-border",
} as const;

export function InboxItemCard({ item }: { item: Doc<"autopilotInboxItems"> }) {
  const updateStatus = useMutation(api.autopilot.mutations.updateInboxItem);

  const handleAction = async (status: "approved" | "rejected" | "snoozed") => {
    try {
      await updateStatus({ itemId: item._id, status });
      toast.success(`Item ${status}`);
    } catch {
      toast.error("Failed to update item");
    }
  };

  const typeLabel =
    TYPE_LABELS[item.type as keyof typeof TYPE_LABELS] ?? item.type;
  const priorityStyle =
    PRIORITY_STYLES[item.priority as keyof typeof PRIORITY_STYLES] ??
    PRIORITY_STYLES.low;
  const isPending = item.status === "pending";

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs", priorityStyle)} variant="outline">
              {item.priority}
            </Badge>
            <Badge variant="secondary">{typeLabel}</Badge>
            <span className="text-muted-foreground text-xs">
              {formatDistanceToNow(item.createdAt, { addSuffix: true })}
            </span>
          </div>
          <h3 className="mt-2 font-medium">{item.title}</h3>
          <p className="mt-1 text-muted-foreground text-sm">{item.summary}</p>
          {item.actionUrl && (
            <a
              className="mt-2 inline-flex items-center gap-1 text-primary text-sm hover:underline"
              href={item.actionUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              View <IconExternalLink className="size-3" />
            </a>
          )}
        </div>
        {isPending && (
          <div className="flex shrink-0 gap-1">
            <Button
              onClick={() => handleAction("approved")}
              size="icon"
              title="Approve"
              variant="ghost"
            >
              <IconCheck className="size-4 text-green-500" />
            </Button>
            <Button
              onClick={() => handleAction("snoozed")}
              size="icon"
              title="Snooze"
              variant="ghost"
            >
              <IconClock className="size-4 text-yellow-500" />
            </Button>
            <Button
              onClick={() => handleAction("rejected")}
              size="icon"
              title="Reject"
              variant="ghost"
            >
              <IconX className="size-4 text-red-500" />
            </Button>
          </div>
        )}
        {!isPending && <Badge variant="outline">{item.status}</Badge>}
      </div>
    </div>
  );
}
