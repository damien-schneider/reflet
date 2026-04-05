"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import {
  IconBrandGithub,
  IconFileText,
  IconMail,
  IconSparkles,
  IconTrendingUp,
  IconUserSearch,
  IconUsers,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

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
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
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
  const [activeTab, setActiveTab] = useState<string>("pipeline");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <H2 variant="card">Sales Pipeline</H2>
      </div>

      <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
            activeTab === "pipeline"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab("pipeline")}
          type="button"
        >
          <IconTrendingUp className="size-4" />
          Pipeline
        </button>
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
            activeTab === "insights"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab("insights")}
          type="button"
        >
          <IconFileText className="size-4" />
          Insights
        </button>
      </div>

      {activeTab === "pipeline" && <SalesPipelineTab />}
      {activeTab === "insights" && <SalesInsightsTab />}
    </div>
  );
}

function SalesInsightsTab() {
  const { organizationId } = useAutopilotContext();

  const docs = useQuery(api.autopilot.queries.documents.listDocuments, {
    organizationId,
    type: "prospect_brief",
    limit: 50,
  });

  if (docs === undefined) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }, (_, i) => (
          <Skeleton
            className="h-24 w-full rounded-lg"
            key={`skel-${String(i)}`}
          />
        ))}
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
        <div className="text-center">
          <IconFileText className="mx-auto mb-2 size-8" />
          <p>
            No prospect insights yet. The Sales Agent will create briefs during
            prospecting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {docs.map((doc) => (
        <Card key={doc._id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{doc.title}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              {doc.tags.map((tag) => (
                <Badge className="text-xs" key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
              <span className="text-xs">
                {formatDistanceToNow(doc.createdAt, { addSuffix: true })}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TiptapMarkdownEditor
              className="text-muted-foreground"
              editable={false}
              minimal
              value={doc.content}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SalesPipelineTab() {
  const { organizationId } = useAutopilotContext();

  const stats = useQuery(api.autopilot.queries.leads.getSalesStats, {
    organizationId,
  });

  const leads = useQuery(api.autopilot.queries.leads.listLeads, {
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <IconUsers className="size-5" />
            Leads ({leads.length})
          </CardTitle>
          <DiscoverLeadsButton />
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
                <LeadCard key={lead._id} lead={lead} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DiscoverLeadsButton() {
  const { organizationId, isAdmin } = useAutopilotContext();
  const triggerDiscovery = useMutation(
    api.autopilot.sales_mutations.triggerLeadDiscovery
  );
  const [loading, setLoading] = useState(false);

  if (!isAdmin) {
    return null;
  }

  const handleClick = async () => {
    setLoading(true);
    try {
      await triggerDiscovery({ organizationId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      disabled={loading}
      onClick={handleClick}
      size="sm"
      variant="outline"
    >
      <IconSparkles className="size-4" />
      {loading ? "Discovering…" : "Discover Leads"}
    </Button>
  );
}

const SCORE_STYLES = {
  high: "bg-green-500/10 text-green-600",
  medium: "bg-yellow-500/10 text-yellow-600",
  low: "bg-muted text-muted-foreground",
} as const;

function getScoreTier(score: number): keyof typeof SCORE_STYLES {
  const HIGH_THRESHOLD = 70;
  const MEDIUM_THRESHOLD = 40;
  if (score >= HIGH_THRESHOLD) {
    return "high";
  }
  return score >= MEDIUM_THRESHOLD ? "medium" : "low";
}

function LeadCard({
  lead,
}: {
  lead: {
    _id: string;
    name: string;
    status: string;
    source: string;
    company?: string;
    email?: string;
    notes?: string;
    score?: number;
    githubUsername?: string;
    githubProfileUrl?: string;
    bio?: string;
    createdAt: number;
    nextFollowUpAt?: number;
  };
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{lead.name}</span>
          {lead.score !== undefined && (
            <Badge
              className={cn("text-xs", SCORE_STYLES[getScoreTier(lead.score)])}
              variant="outline"
            >
              {lead.score}
            </Badge>
          )}
          <Badge
            className={cn(
              "text-xs",
              STATUS_STYLES[lead.status as keyof typeof STATUS_STYLES]
            )}
            variant="outline"
          >
            {lead.status}
          </Badge>
          <Badge className="text-xs" variant="secondary">
            {SOURCE_LABELS[lead.source as keyof typeof SOURCE_LABELS] ??
              lead.source}
          </Badge>
        </div>
        {lead.company && (
          <p className="mt-0.5 text-muted-foreground text-xs">{lead.company}</p>
        )}
        {lead.bio && (
          <p className="mt-0.5 line-clamp-1 text-muted-foreground text-xs">
            {lead.bio}
          </p>
        )}
        <div className="mt-1 flex items-center gap-3">
          {lead.email && (
            <a
              className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
              href={`mailto:${lead.email}`}
            >
              <IconMail className="size-3" />
              {lead.email}
            </a>
          )}
          {lead.githubUsername && (
            <a
              className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
              href={
                lead.githubProfileUrl ??
                `https://github.com/${lead.githubUsername}`
              }
              rel="noopener noreferrer"
              target="_blank"
            >
              <IconBrandGithub className="size-3" />
              {lead.githubUsername}
            </a>
          )}
        </div>
        {lead.notes && (
          <p className="mt-1 line-clamp-1 text-muted-foreground text-xs">
            {lead.notes}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <span className="text-muted-foreground text-xs">
          {formatDistanceToNow(lead.createdAt, { addSuffix: true })}
        </span>
        {lead.nextFollowUpAt && (
          <p className="text-blue-500 text-xs">
            Follow-up:{" "}
            {formatDistanceToNow(lead.nextFollowUpAt, { addSuffix: true })}
          </p>
        )}
      </div>
    </div>
  );
}
