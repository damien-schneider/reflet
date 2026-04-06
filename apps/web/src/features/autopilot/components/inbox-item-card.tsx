"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { IconCheck, IconExternalLink, IconX } from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgentIdentity } from "@/features/autopilot/components/agent-identity";
import { cn } from "@/lib/utils";

const TYPE_LABELS = {
  budget_override: "Budget",
  ceo_report: "CEO Report",
  company_brief_review: "Company Brief",
  email_draft: "Email Draft",
  email_received: "Email",
  growth_content: "Growth",
  growth_post: "Growth",
  initiative_proposal: "Initiative",
  knowledge_update: "Knowledge",
  market_research: "Research",
  note_triage: "Note",
  pr_review: "PR Review",
  revenue_alert: "Revenue",
  sales_lead: "Lead",
  sales_outreach_draft: "Outreach",
  sales_pipeline_update: "Pipeline",
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

const PLATFORM_LABELS: Record<string, string> = {
  "linkedin.com": "LinkedIn",
  "news.ycombinator.com": "HN",
  "reddit.com": "Reddit",
  "twitter.com": "X",
  "x.com": "X",
};

function formatTargetLabel(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    return PLATFORM_LABELS[hostname] ?? hostname;
  } catch {
    return "Link";
  }
}

interface UnifiedInboxItem {
  _id: string;
  _source: "work" | "document" | "report";
  actionUrl?: string;
  assignedAgent?: string;
  content?: string;
  createdAt: number;
  description?: string;
  needsReview: boolean;
  platform?: string;
  priority?: string;
  prUrl?: string;
  reviewType?: string;
  sourceAgent?: string;
  status: string;
  targetUrl?: string;
  title: string;
  type?: string;
  updatedAt: number;
}

export function InboxItemCard({
  item,
  onClick,
  selected = false,
  onMarkRead: _onMarkRead,
}: {
  item: UnifiedInboxItem;
  onClick?: () => void;
  selected?: boolean;
  onMarkRead?: () => void;
}) {
  const approveWork = useMutation(
    api.autopilot.mutations.inbox.approveWorkItem
  );
  const rejectWork = useMutation(api.autopilot.mutations.inbox.rejectWorkItem);
  const approveDoc = useMutation(api.autopilot.mutations.inbox.approveDocument);
  const rejectDoc = useMutation(api.autopilot.mutations.inbox.rejectDocument);
  const acknowledgeReport = useMutation(
    api.autopilot.mutations.reports.acknowledgeReport
  );

  const handleAction = async (action: "approved" | "rejected") => {
    try {
      if (item._source === "report") {
        if (action === "approved") {
          await acknowledgeReport({ reportId: item._id as never });
          toast.success("Report acknowledged");
        }
        return;
      }
      if (action === "approved") {
        if (item._source === "work") {
          await approveWork({ workItemId: item._id as never });
        } else {
          await approveDoc({ documentId: item._id as never });
        }
      } else if (item._source === "work") {
        await rejectWork({ workItemId: item._id as never });
      } else {
        await rejectDoc({ documentId: item._id as never });
      }
      toast.success(`Item ${action}`);
    } catch {
      toast.error("Failed to update item");
    }
  };

  const typeLabel =
    TYPE_LABELS[(item.reviewType ?? item.type) as keyof typeof TYPE_LABELS] ??
    TYPE_LABELS[item.type as keyof typeof TYPE_LABELS] ??
    item.type ??
    item._source;
  const priorityStyle =
    PRIORITY_STYLES[item.priority as keyof typeof PRIORITY_STYLES] ??
    PRIORITY_STYLES.low;
  const isPending = item.needsReview;
  const agentName =
    item._source === "work" ? item.assignedAgent : item.sourceAgent;

  return (
    <button
      className={cn(
        "group relative flex w-full border-border border-b px-3 py-3 text-left transition-colors last:border-b-0",
        selected && "bg-primary/5",
        !selected && "hover:bg-muted/40",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
      type="button"
    >
      <div className="flex w-full items-start gap-3">
        {/* Review indicator */}
        <span className="mt-1.5 flex size-4 shrink-0 items-center justify-center">
          {isPending ? (
            <span className="block size-2 rounded-full bg-blue-600 dark:bg-blue-400" />
          ) : (
            <span aria-hidden="true" className="size-4" />
          )}
        </span>

        {/* Source agent */}
        <div className="mt-1 shrink-0">
          <AgentIdentity
            agent={agentName ?? "system"}
            showLabel={false}
            size="sm"
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-sm">{item.title}</span>
            <Badge
              className={cn("shrink-0 text-[10px]", priorityStyle)}
              variant="outline"
            >
              {item.priority}
            </Badge>
            <Badge className="shrink-0 text-[10px]" variant="secondary">
              {typeLabel}
            </Badge>
          </div>
          <p className="mt-0.5 line-clamp-1 text-muted-foreground text-xs">
            {item.description ?? item.content ?? ""}
          </p>
          {/* Target URL chip for Growth content (shows what thread is being replied to) */}
          {item.targetUrl && (
            <div className="mt-1 flex items-center gap-1">
              <a
                className="inline-flex items-center gap-1 rounded border bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                href={item.targetUrl}
                onClick={(e) => e.stopPropagation()}
                rel="noopener noreferrer"
                target="_blank"
              >
                <IconExternalLink className="size-2.5" />
                Replying to {formatTargetLabel(item.targetUrl)}
              </a>
            </div>
          )}
        </div>

        {/* Trailing: timestamp + actions */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(item.createdAt, { addSuffix: true })}
          </span>
          {isPending && (
            <div className="flex gap-0.5">
              <Button
                className="size-7"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction("approved");
                }}
                size="icon"
                title={item._source === "report" ? "Acknowledge" : "Approve"}
                variant="ghost"
              >
                <IconCheck className="size-3.5 text-green-500" />
              </Button>
              {item._source !== "report" && (
                <Button
                  className="size-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction("rejected");
                  }}
                  size="icon"
                  title="Reject"
                  variant="ghost"
                >
                  <IconX className="size-3.5 text-red-500" />
                </Button>
              )}
            </div>
          )}
          {!isPending && (
            <Badge className="text-[10px]" variant="outline">
              {item.status}
            </Badge>
          )}
          {item.actionUrl && (
            <a
              className="text-muted-foreground transition-colors hover:text-foreground"
              href={item.actionUrl}
              onClick={(e) => e.stopPropagation()}
              rel="noopener noreferrer"
              target="_blank"
            >
              <IconExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      </div>
    </button>
  );
}
