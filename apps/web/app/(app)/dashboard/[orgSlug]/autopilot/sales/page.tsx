"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import {
  IconMail,
  IconTrendingUp,
  IconUserSearch,
  IconUsers,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
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

const PIPELINE_STAGES = [
  { key: "discovered", label: "Discovered", color: "bg-blue-500" },
  { key: "contacted", label: "Contacted", color: "bg-purple-500" },
  { key: "replied", label: "Replied", color: "bg-yellow-500" },
  { key: "demo", label: "Demo", color: "bg-orange-500" },
  { key: "converted", label: "Converted", color: "bg-green-500" },
] as const;

const STATUS_STYLES = {
  discovered: "bg-blue-500/10 text-blue-500",
  contacted: "bg-purple-500/10 text-purple-500",
  replied: "bg-yellow-500/10 text-yellow-500",
  demo: "bg-orange-500/10 text-orange-500",
  converted: "bg-green-500/10 text-green-500",
  churned: "bg-red-500/10 text-red-500",
  disqualified: "bg-muted text-muted-foreground",
} as const;

const SOURCE_LABELS = {
  github_star: "GitHub Star",
  github_fork: "GitHub Fork",
  product_hunt: "Product Hunt",
  hackernews: "Hacker News",
  reddit: "Reddit",
  web_search: "Web Search",
  referral: "Referral",
  manual: "Manual",
} as const;

export default function SalesPipelinePage() {
  const { organizationId } = useAutopilotContext();

  const stats = useQuery(api.autopilot.sales_queries.getSalesStats, {
    organizationId,
  });

  const leads = useQuery(api.autopilot.sales_queries.listLeads, {
    organizationId,
    limit: 100,
  });

  if (stats === undefined || leads === undefined) {
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
        <H2 variant="card">Sales Pipeline</H2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Leads</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl">{stats.totalLeads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl text-blue-500">
              {stats.totalActive}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conversion Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl text-green-500">
              {stats.conversionRate}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Outreach</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl text-yellow-500">
              {stats.pendingDrafts}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <IconTrendingUp className="size-5" />
            Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {PIPELINE_STAGES.map((stage) => {
              const count =
                stats.pipeline[stage.key as keyof typeof stats.pipeline] ?? 0;
              return (
                <div className="flex-1 text-center" key={stage.key}>
                  <div
                    className={cn(
                      "mb-1 rounded-lg py-4",
                      stage.color,
                      "bg-opacity-10"
                    )}
                  >
                    <p className="font-bold text-2xl">{count}</p>
                  </div>
                  <p className="text-muted-foreground text-xs">{stage.label}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <IconUsers className="size-5" />
            Leads ({leads.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-center">
              <div>
                <IconUserSearch className="mx-auto mb-2 size-8 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">
                  No leads yet. The Sales Agent will start discovering leads.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {leads.map((lead) => (
                <div
                  className="flex items-start gap-3 rounded-lg border p-3"
                  key={lead._id}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{lead.name}</span>
                      <Badge
                        className={cn(
                          "text-xs",
                          STATUS_STYLES[
                            lead.status as keyof typeof STATUS_STYLES
                          ]
                        )}
                        variant="outline"
                      >
                        {lead.status}
                      </Badge>
                      <Badge className="text-xs" variant="secondary">
                        {SOURCE_LABELS[
                          lead.source as keyof typeof SOURCE_LABELS
                        ] ?? lead.source}
                      </Badge>
                    </div>
                    {lead.company && (
                      <p className="mt-0.5 text-muted-foreground text-xs">
                        {lead.company}
                      </p>
                    )}
                    {lead.email && (
                      <p className="flex items-center gap-1 text-muted-foreground text-xs">
                        <IconMail className="size-3" />
                        {lead.email}
                      </p>
                    )}
                    {lead.notes && (
                      <p className="mt-1 line-clamp-1 text-muted-foreground text-xs">
                        {lead.notes}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-muted-foreground text-xs">
                      {formatDistanceToNow(lead.createdAt, {
                        addSuffix: true,
                      })}
                    </span>
                    {lead.nextFollowUpAt && (
                      <p className="text-blue-500 text-xs">
                        Follow-up:{" "}
                        {formatDistanceToNow(lead.nextFollowUpAt, {
                          addSuffix: true,
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
