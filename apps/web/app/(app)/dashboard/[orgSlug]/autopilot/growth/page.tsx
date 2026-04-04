"use client";

import { api } from "@reflet/backend/convex/_generated/api";
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
import { Skeleton } from "@/components/ui/skeleton";
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

function GrowthContentTab() {
  const { organizationId } = useAutopilotContext();

  const items = useQuery(api.autopilot.queries.growth.listGrowthItems, {
    organizationId,
    limit: 50,
  });

  const updateItem = useMutation(
    api.autopilot.mutations.growth.updateGrowthItem
  );

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  const handleApprove = async (
    itemId: (typeof items extends (infer T)[] | undefined ? T : never)["_id"]
  ) => {
    try {
      await updateItem({ itemId, status: "approved" });
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

  if (items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
        No growth content yet. The Growth Agent will generate content after
        tasks are completed.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
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
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-muted-foreground text-sm">
                  {item.content}
                </p>
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
      })}
    </div>
  );
}

function GrowthResearchTab() {
  const { organizationId } = useAutopilotContext();

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
            <p className="whitespace-pre-wrap text-muted-foreground text-sm">
              {doc.content}
            </p>
          </CardContent>
        </Card>
      ))}
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

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {competitors.map((comp) => (
        <Card key={comp._id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{comp.name}</CardTitle>
              {comp.url && (
                <a
                  className="text-muted-foreground hover:text-foreground"
                  href={comp.url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <IconExternalLink className="size-4" />
                </a>
              )}
            </div>
            {comp.pricingTier && (
              <CardDescription>Pricing: {comp.pricingTier}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {comp.description && (
              <p className="text-muted-foreground">{comp.description}</p>
            )}
            {comp.strengths && (
              <div>
                <span className="font-medium text-green-500">Strengths:</span>{" "}
                {comp.strengths}
              </div>
            )}
            {comp.weaknesses && (
              <div>
                <span className="font-medium text-red-500">Weaknesses:</span>{" "}
                {comp.weaknesses}
              </div>
            )}
            {comp.lastResearchedAt && (
              <p className="text-muted-foreground text-xs">
                Last researched:{" "}
                {formatDistanceToNow(comp.lastResearchedAt, {
                  addSuffix: true,
                })}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
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
