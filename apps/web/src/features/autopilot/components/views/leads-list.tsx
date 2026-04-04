"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  discovered: "bg-muted text-muted-foreground",
  contacted: "bg-blue-500/10 text-blue-500",
  replied: "bg-cyan-500/10 text-cyan-500",
  demo: "bg-purple-500/10 text-purple-500",
  converted: "bg-green-500/10 text-green-500",
  churned: "bg-red-500/10 text-red-500",
  disqualified: "bg-muted text-muted-foreground line-through",
};

const SOURCE_LABELS: Record<string, string> = {
  github_star: "GitHub Star",
  github_fork: "GitHub Fork",
  product_hunt: "Product Hunt",
  hackernews: "Hacker News",
  reddit: "Reddit",
  web_search: "Web Search",
  referral: "Referral",
  manual: "Manual",
};

export function LeadsList({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const leads = useQuery(api.autopilot.queries.leads.listLeads, {
    organizationId,
    limit: 50,
  });

  if (leads === undefined) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton
            className="h-16 w-full rounded-lg"
            key={`skel-${String(i)}`}
          />
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground text-sm">
        No leads discovered yet
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {leads.map((lead) => (
        <div className="rounded-lg border p-3" key={lead._id}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{lead.name}</span>
              {lead.company && (
                <span className="text-muted-foreground text-xs">
                  @ {lead.company}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={cn("text-xs", STATUS_STYLES[lead.status])}
                variant="secondary"
              >
                {lead.status}
              </Badge>
              <Badge variant="outline">
                {SOURCE_LABELS[lead.source] ?? lead.source}
              </Badge>
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-muted-foreground text-xs">
            {lead.email && <span>{lead.email}</span>}
            {lead.outreachCount > 0 && (
              <span>{lead.outreachCount} outreach</span>
            )}
            <span>
              {formatDistanceToNow(lead.createdAt, { addSuffix: true })}
            </span>
          </div>
          {lead.notes && (
            <p className="mt-1 line-clamp-1 text-muted-foreground text-xs">
              {lead.notes}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
