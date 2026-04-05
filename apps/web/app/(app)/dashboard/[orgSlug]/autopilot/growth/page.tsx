"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconBrandLinkedin,
  IconBrandReddit,
  IconBrandX,
  IconCopy,
  IconExternalLink,
  IconFileText,
  IconMail,
  IconNews,
  IconSearch,
  IconTarget,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { H2 } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { cn } from "@/lib/utils";

const TYPE_CONFIG = {
  reddit_reply: { icon: IconBrandReddit, label: "Reddit" },
  linkedin_post: { icon: IconBrandLinkedin, label: "LinkedIn" },
  twitter_post: { icon: IconBrandX, label: "X / Twitter" },
  hn_comment: { icon: IconNews, label: "Hacker News" },
  blog_post: { icon: IconFileText, label: "Blog Post" },
  email_campaign: { icon: IconMail, label: "Email" },
  changelog_announce: { icon: IconNews, label: "Changelog" },
} as const;

const STATUS_STYLES = {
  draft: "bg-muted text-muted-foreground",
  pending_review: "bg-yellow-500/10 text-yellow-500",
  approved: "bg-green-500/10 text-green-500",
  published: "bg-blue-500/10 text-blue-500",
  rejected: "bg-red-500/10 text-red-500",
} as const;

const BULLET_PREFIX_RE = /^[-•]\s*/;

const IMPACT_COLORS = {
  high: "bg-red-500/10 text-red-500",
  medium: "bg-amber-500/10 text-amber-500",
  low: "bg-blue-500/10 text-blue-500",
} as const;

function getScoreColor(score: number): string {
  if (score >= 80) {
    return "bg-green-500 text-white";
  }
  if (score >= 50) {
    return "bg-amber-500 text-white";
  }
  return "bg-muted text-muted-foreground";
}

function GrowthContentTab() {
  const { organizationId } = useAutopilotContext();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const items = useQuery(api.autopilot.queries.documents.listDocuments, {
    organizationId,
    limit: 50,
  });

  const updateItem = useMutation(
    api.autopilot.mutations.documents.updateDocument
  );

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  const handleApprove = async (docId: Id<"autopilotDocuments">) => {
    try {
      await updateItem({
        documentId: docId,
        status: "published",
        needsReview: false,
      });
      toast.success("Item approved");
    } catch {
      toast.error("Failed to approve item");
    }
  };

  if (items === undefined) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton
            className="h-32 w-full rounded-lg"
            key={`skel-${String(i)}`}
          />
        ))}
      </div>
    );
  }

  const CONTENT_TYPES = new Set([
    "blog_post",
    "reddit_reply",
    "linkedin_post",
    "twitter_post",
    "hn_comment",
    "changelog",
  ]);

  const contentItems = items.filter((item) => CONTENT_TYPES.has(item.type));

  const filtered = contentItems.filter((item) => {
    if (typeFilter !== "all" && item.type !== typeFilter) {
      return false;
    }
    if (statusFilter !== "all" && item.status !== statusFilter) {
      return false;
    }
    return true;
  });

  if (contentItems.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
        No growth content yet. The Growth Agent will generate content after
        tasks are completed.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        <Select
          onValueChange={(v) => setTypeFilter(v ?? "all")}
          value={typeFilter}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                {cfg.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          onValueChange={(v) => setStatusFilter(v ?? "all")}
          value={statusFilter}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.keys(STATUS_STYLES).map((key) => (
              <SelectItem key={key} value={key}>
                {key.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground text-xs">
          {filtered.length} of {items.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
          No items match the selected filters.
        </div>
      ) : (
        filtered.map((item) => {
          const typeConfig = TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG];
          const TypeIcon = typeConfig?.icon ?? IconFileText;
          const typeLabel = typeConfig?.label ?? item.type;
          const statusStyle =
            STATUS_STYLES[item.status as keyof typeof STATUS_STYLES] ??
            STATUS_STYLES.draft;
          const isPendingReview = item.status === "pending_review";

          return (
            <div className="rounded-lg border p-4" key={item._id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <TypeIcon className="size-4 text-muted-foreground" />
                    <Badge variant="secondary">{typeLabel}</Badge>
                    <Badge
                      className={cn("text-xs", statusStyle)}
                      variant="outline"
                    >
                      {item.status}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {formatDistanceToNow(item.createdAt, {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <h3 className="mt-2 font-medium">{item.title}</h3>
                  <div className="mt-1 line-clamp-3 text-muted-foreground text-sm">
                    <TiptapMarkdownEditor
                      editable={false}
                      minimal
                      value={item.content}
                    />
                  </div>
                </div>

                <div className="flex shrink-0 gap-1">
                  <Button
                    onClick={() => handleCopy(item.content)}
                    size="icon"
                    title="Copy content"
                    variant="ghost"
                  >
                    <IconCopy className="size-4" />
                  </Button>
                  {item.targetUrl && (
                    <a
                      className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      href={item.targetUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                      title="Open target"
                    >
                      <IconExternalLink className="size-4" />
                    </a>
                  )}
                  {isPendingReview && (
                    <Button
                      onClick={() => handleApprove(item._id)}
                      size="sm"
                      variant="outline"
                    >
                      Approve
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function GrowthResearchTab() {
  const { organizationId } = useAutopilotContext();
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  const docs = useQuery(api.autopilot.queries.documents.listDocuments, {
    organizationId,
    type: "market_research",
    limit: 50,
  });

  if (docs === undefined) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
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
          <IconSearch className="mx-auto mb-2 size-8" />
          <p>
            No market research yet. The Growth Agent will produce research when
            it runs.
          </p>
        </div>
      </div>
    );
  }

  const sorted = [...docs].sort(
    (a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0)
  );

  return (
    <div className="space-y-3">
      {sorted.map((doc) => {
        const isExpanded = expandedDocId === doc._id;

        return (
          <Card key={doc._id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <button
                    className="text-left"
                    onClick={() =>
                      setExpandedDocId(isExpanded ? null : doc._id)
                    }
                    type="button"
                  >
                    <CardTitle className="text-base hover:underline">
                      {doc.title}
                    </CardTitle>
                  </button>
                  <CardDescription className="mt-1 flex flex-wrap items-center gap-2">
                    {doc.impactLevel && (
                      <Badge
                        className={cn(
                          "text-xs",
                          IMPACT_COLORS[
                            doc.impactLevel as keyof typeof IMPACT_COLORS
                          ]
                        )}
                        variant="outline"
                      >
                        {doc.impactLevel} impact
                      </Badge>
                    )}
                    {doc.tags.map((tag) => (
                      <Badge className="text-xs" key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                    <span className="text-xs">
                      {formatDistanceToNow(doc.createdAt, { addSuffix: true })}
                    </span>
                  </CardDescription>
                </div>
                {doc.relevanceScore !== undefined && (
                  <span
                    className={cn(
                      "inline-flex size-9 shrink-0 items-center justify-center rounded-full font-bold text-xs",
                      getScoreColor(doc.relevanceScore)
                    )}
                    title={`Relevance: ${String(doc.relevanceScore)}%`}
                  >
                    {doc.relevanceScore}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Key findings */}
              {doc.keyFindings && doc.keyFindings.length > 0 && (
                <ul className="space-y-1">
                  {doc.keyFindings.map((finding) => (
                    <li
                      className="flex items-start gap-2 text-muted-foreground text-sm"
                      key={finding}
                    >
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      {finding}
                    </li>
                  ))}
                </ul>
              )}

              {/* Source links */}
              {doc.sourceUrls && doc.sourceUrls.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {doc.sourceUrls.map((url) => (
                    <a
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground text-xs hover:text-foreground"
                      href={url}
                      key={url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <IconExternalLink className="size-3" />
                      {new URL(url).hostname.replace("www.", "")}
                    </a>
                  ))}
                </div>
              )}

              {/* Expandable full content */}
              {isExpanded && (
                <div className="border-t pt-3">
                  <TiptapMarkdownEditor
                    className="text-muted-foreground"
                    editable={false}
                    minimal
                    value={doc.content}
                  />
                </div>
              )}

              {!isExpanded && (
                <button
                  className="text-muted-foreground text-xs hover:text-foreground"
                  onClick={() => setExpandedDocId(doc._id)}
                  type="button"
                >
                  Show full content...
                </button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function GrowthCompetitorsTab() {
  const { organizationId } = useAutopilotContext();

  const competitors = useQuery(
    api.autopilot.queries.competitors.listCompetitors,
    { organizationId }
  );

  if (competitors === undefined) {
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

  if (competitors.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
        <div className="text-center">
          <IconTarget className="mx-auto mb-2 size-8" />
          <p>
            No competitors tracked yet. The Growth Agent will discover them
            during market research.
          </p>
        </div>
      </div>
    );
  }

  const STALENESS_7D = 7 * 24 * 60 * 60 * 1000;
  const STALENESS_30D = 30 * 24 * 60 * 60 * 1000;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {competitors.map((comp) => (
        <CompetitorCard
          comp={comp}
          key={comp._id}
          staleness7d={STALENESS_7D}
          staleness30d={STALENESS_30D}
        />
      ))}
    </div>
  );
}

function CompetitorCard({
  comp,
  staleness7d,
  staleness30d,
}: {
  comp: {
    _id: string;
    name: string;
    url?: string;
    description?: string;
    pricingTier?: string;
    trafficEstimate?: string;
    features?: string;
    strengths?: string;
    weaknesses?: string;
    pricing?: string;
    differentiator?: string;
    lastResearchedAt?: number;
  };
  staleness7d: number;
  staleness30d: number;
}) {
  const staleness = comp.lastResearchedAt
    ? Date.now() - comp.lastResearchedAt
    : undefined;
  const isVeryStale = staleness !== undefined && staleness > staleness30d;
  const isAging =
    staleness !== undefined && staleness > staleness7d && !isVeryStale;
  const featureList = comp.features
    ? comp.features
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean)
    : [];

  return (
    <Card
      className={cn(
        isVeryStale && "border-red-500/20",
        isAging && "border-amber-500/20"
      )}
    >
      <CompetitorCardHeader
        comp={comp}
        isAging={isAging}
        isVeryStale={isVeryStale}
      />
      <CardContent className="space-y-3 text-sm">
        {comp.description && (
          <p className="text-muted-foreground">{comp.description}</p>
        )}

        {featureList.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {featureList.map((feat) => (
              <Badge className="text-xs" key={feat} variant="outline">
                {feat}
              </Badge>
            ))}
          </div>
        )}

        {comp.pricing && (
          <div>
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Pricing
            </span>
            <p className="mt-0.5">{comp.pricing}</p>
          </div>
        )}

        {comp.strengths && (
          <BulletList color="green" items={comp.strengths} label="Strengths" />
        )}

        {comp.weaknesses && (
          <BulletList color="red" items={comp.weaknesses} label="Weaknesses" />
        )}

        {comp.differentiator && (
          <div className="rounded-md bg-muted/50 p-3">
            <span className="font-medium text-xs uppercase tracking-wider">
              How we differ
            </span>
            <p className="mt-0.5 text-muted-foreground">
              {comp.differentiator}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CompetitorCardHeader({
  comp,
  isVeryStale,
  isAging,
}: {
  comp: {
    name: string;
    url?: string;
    pricingTier?: string;
    trafficEstimate?: string;
    lastResearchedAt?: number;
  };
  isVeryStale: boolean;
  isAging: boolean;
}) {
  return (
    <CardHeader>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {comp.url ? (
            <a
              className="font-semibold text-base hover:underline"
              href={comp.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              {comp.name}
            </a>
          ) : (
            <CardTitle className="text-base">{comp.name}</CardTitle>
          )}
          {comp.url && (
            <a
              className="text-muted-foreground hover:text-foreground"
              href={comp.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              <IconExternalLink className="size-3.5" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {comp.pricingTier && (
            <Badge variant="secondary">{comp.pricingTier}</Badge>
          )}
          {comp.trafficEstimate && (
            <Badge className="text-xs" variant="outline">
              {comp.trafficEstimate}
            </Badge>
          )}
        </div>
      </div>
      {comp.lastResearchedAt && (
        <CardDescription
          className={cn(
            "text-xs",
            isVeryStale && "text-red-500",
            isAging && "text-amber-500"
          )}
        >
          Last researched:{" "}
          {formatDistanceToNow(comp.lastResearchedAt, {
            addSuffix: true,
          })}
          {isVeryStale && " — outdated"}
          {isAging && " — aging"}
        </CardDescription>
      )}
    </CardHeader>
  );
}

const BULLET_COLORS = {
  green: { label: "text-green-500", dot: "bg-green-500" },
  red: { label: "text-red-500", dot: "bg-red-500" },
} as const;

function BulletList({
  label,
  items,
  color,
}: {
  label: string;
  items: string;
  color: keyof typeof BULLET_COLORS;
}) {
  const { label: labelColor, dot } = BULLET_COLORS[color];
  return (
    <div>
      <span className={cn("font-medium text-xs", labelColor)}>{label}</span>
      <ul className="mt-1 space-y-0.5">
        {items
          .split("\n")
          .filter(Boolean)
          .map((line) => (
            <li
              className="flex items-start gap-1.5 text-muted-foreground"
              key={line}
            >
              <span
                className={cn("mt-1 size-1.5 shrink-0 rounded-full", dot)}
              />
              {line.replace(BULLET_PREFIX_RE, "")}
            </li>
          ))}
      </ul>
    </div>
  );
}

const GROWTH_TABS = [
  { id: "content", label: "Content", icon: IconFileText },
  { id: "research", label: "Research", icon: IconSearch },
  { id: "competitors", label: "Competitors", icon: IconTarget },
] as const;

export default function AutopilotGrowthPage() {
  const [activeTab, setActiveTab] = useState<string>("content");

  return (
    <div className="space-y-6">
      <H2 variant="card">Growth</H2>

      <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
        {GROWTH_TABS.map((tab) => (
          <button
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "content" && <GrowthContentTab />}
      {activeTab === "research" && <GrowthResearchTab />}
      {activeTab === "competitors" && <GrowthCompetitorsTab />}
    </div>
  );
}
