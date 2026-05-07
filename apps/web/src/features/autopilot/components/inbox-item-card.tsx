import type { api } from "@reflet/backend/convex/_generated/api";
import { IconCheck, IconExternalLink, IconX } from "@tabler/icons-react";
import type { FunctionReturnType } from "convex/server";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgentIdentity } from "@/features/autopilot/components/agent-identity";
import { cn } from "@/lib/utils";

const TYPE_LABEL_OPTIONS = [
  { label: "Budget", value: "budget_override" },
  { label: "CEO Report", value: "ceo_report" },
  { label: "Company Brief", value: "company_brief_review" },
  { label: "Email Draft", value: "email_draft" },
  { label: "Email", value: "email_received" },
  { label: "Growth", value: "growth_content" },
  { label: "Growth", value: "growth_post" },
  { label: "Initiative", value: "initiative_proposal" },
  { label: "Knowledge", value: "knowledge_update" },
  { label: "Research", value: "market_research" },
  { label: "Note", value: "note_triage" },
  { label: "PR Review", value: "pr_review" },
  { label: "Revenue", value: "revenue_alert" },
  { label: "Lead", value: "sales_lead" },
  { label: "Outreach", value: "sales_outreach_draft" },
  { label: "Pipeline", value: "sales_pipeline_update" },
  { label: "Shipped", value: "shipped_notification" },
  { label: "Escalation", value: "support_escalation" },
  { label: "Support Reply", value: "support_reply" },
  { label: "Task", value: "task_approval" },
] as const;

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

type UnifiedInboxItem = FunctionReturnType<
  typeof api.autopilot.queries.inbox.listInboxItems
>[number];

function getTypeLabel(item: UnifiedInboxItem): string {
  const type = item.reviewType ?? item.type;
  const option = TYPE_LABEL_OPTIONS.find((entry) => entry.value === type);
  return option?.label ?? item.type;
}

function getPriority(item: UnifiedInboxItem): string | undefined {
  if (item._source === "work" || item._source === "report") {
    return item.priority;
  }
  return undefined;
}

function getPriorityStyle(priority: string | undefined): string {
  switch (priority) {
    case "critical": {
      return PRIORITY_STYLES.critical;
    }
    case "high": {
      return PRIORITY_STYLES.high;
    }
    case "medium": {
      return PRIORITY_STYLES.medium;
    }
    case "low": {
      return PRIORITY_STYLES.low;
    }
    default: {
      return PRIORITY_STYLES.low;
    }
  }
}

function getDescription(item: UnifiedInboxItem): string {
  if (item._source === "document") {
    return item.content;
  }
  if (item._source === "work" || item._source === "report") {
    return item.description;
  }
  return "";
}

function getTargetUrl(item: UnifiedInboxItem): string | undefined {
  if (item._source === "document") {
    return item.targetUrl;
  }
  return undefined;
}

function getAgentName(item: UnifiedInboxItem): string | undefined {
  if (item._source === "work") {
    return item.assignedAgent;
  }
  return item.sourceAgent;
}

export function InboxItemCard({
  item,
  isUpdating = false,
  onApprove,
  onClick,
  onReject,
  selected = false,
}: {
  isUpdating?: boolean;
  item: UnifiedInboxItem;
  onApprove?: (item: UnifiedInboxItem) => void;
  onClick?: () => void;
  onReject?: (item: UnifiedInboxItem) => void;
  selected?: boolean;
}) {
  const typeLabel = getTypeLabel(item);
  const priority = getPriority(item);
  const priorityStyle = getPriorityStyle(priority);
  const isPending = item.needsReview;
  const agentName = getAgentName(item);
  const description = getDescription(item);
  const targetUrl = getTargetUrl(item);

  return (
    <div
      className={cn(
        "group relative flex w-full items-start gap-3 border-border border-b px-3 py-3 text-left transition-colors last:border-b-0",
        selected && "bg-primary/5",
        !selected && "hover:bg-muted/40"
      )}
    >
      <div className="min-w-0 flex-1">
        <Button
          className="h-auto w-full justify-start gap-3 whitespace-normal rounded-none border-0 bg-transparent p-0 text-left text-foreground hover:bg-transparent hover:text-foreground"
          onClick={onClick}
          variant="ghost"
        >
          <span className="mt-1.5 flex size-4 shrink-0 items-center justify-center">
            {isPending ? (
              <span className="block size-2 rounded-full bg-blue-600 dark:bg-blue-400" />
            ) : (
              <span aria-hidden="true" className="size-4" />
            )}
          </span>

          <span className="mt-1 shrink-0">
            <AgentIdentity
              agent={agentName ?? "system"}
              showLabel={false}
              size="sm"
            />
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate font-medium text-sm">{item.title}</span>
              {priority && (
                <Badge
                  className={cn("shrink-0 text-[10px]", priorityStyle)}
                  variant="outline"
                >
                  {priority}
                </Badge>
              )}
              <Badge className="shrink-0 text-[10px]" variant="secondary">
                {typeLabel}
              </Badge>
            </span>
            <span className="mt-0.5 line-clamp-1 block text-muted-foreground text-xs">
              {description}
            </span>
          </span>
        </Button>
        {targetUrl && (
          <div className="mt-1 ml-11 flex items-center gap-1">
            <a
              className="inline-flex items-center gap-1 rounded border bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              href={targetUrl}
              onClick={(event) => event.stopPropagation()}
              rel="noopener noreferrer"
              target="_blank"
            >
              <IconExternalLink className="size-2.5" />
              Replying to {formatTargetLabel(targetUrl)}
            </a>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="text-[11px] text-muted-foreground">
          {formatDistanceToNow(item.createdAt, { addSuffix: true })}
        </span>
        {isPending && (
          <div className="flex gap-0.5">
            <Button
              aria-label={item._source === "report" ? "Acknowledge" : "Approve"}
              className="size-7"
              disabled={isUpdating}
              onClick={(event) => {
                event.stopPropagation();
                onApprove?.(item);
              }}
              size="icon"
              title={item._source === "report" ? "Acknowledge" : "Approve"}
              variant="ghost"
            >
              <IconCheck className="size-3.5 text-green-500" />
            </Button>
            {item._source !== "report" && (
              <Button
                aria-label="Reject"
                className="size-7"
                disabled={isUpdating}
                onClick={(event) => {
                  event.stopPropagation();
                  onReject?.(item);
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
      </div>
    </div>
  );
}
