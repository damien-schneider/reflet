"use client";

import { CommunityTab } from "@app/(app)/dashboard/[orgSlug]/autopilot/intelligence/_components/community-tab";
import { CompetitorsTab } from "@app/(app)/dashboard/[orgSlug]/autopilot/intelligence/_components/competitors-tab";
import { InsightsTab } from "@app/(app)/dashboard/[orgSlug]/autopilot/intelligence/_components/insights-tab";
import { api } from "@reflet/backend/convex/_generated/api";
import {
  IconBrandLinkedin,
  IconBrandReddit,
  IconBrandX,
  IconBulb,
  IconCopy,
  IconExternalLink,
  IconFileText,
  IconMail,
  IconNews,
  IconRocket,
  IconSettings,
  IconUsers,
  IconWorldSearch,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { H2 } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { IntelligenceSettings } from "@/features/intelligence/components/intelligence-settings";
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

  const items = useQuery(api.autopilot.queries.listGrowthItems, {
    organizationId,
    limit: 50,
  });

  const updateItem = useMutation(api.autopilot.mutations.updateGrowthItem);

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

export default function AutopilotGrowthPage() {
  const { orgSlug } = useAutopilotContext();
  const [activeTab, setActiveTab] = useState("content");

  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  if (!org) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <H2 variant="card">Growth & Intelligence</H2>

      <Tabs onValueChange={setActiveTab} value={activeTab}>
        <TabsList>
          <TabsTrigger value="content">
            <IconRocket className="mr-1.5 size-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="insights">
            <IconBulb className="mr-1.5 size-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="community">
            <IconWorldSearch className="mr-1.5 size-4" />
            Community
          </TabsTrigger>
          <TabsTrigger value="competitors">
            <IconUsers className="mr-1.5 size-4" />
            Competitors
          </TabsTrigger>
          <TabsTrigger value="settings">
            <IconSettings className="mr-1.5 size-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent className="mt-6" value="content">
          <GrowthContentTab />
        </TabsContent>

        <TabsContent className="mt-6" value="insights">
          <InsightsTab organizationId={org._id} orgSlug={orgSlug} />
        </TabsContent>

        <TabsContent className="mt-6" value="community">
          <CommunityTab organizationId={org._id} />
        </TabsContent>

        <TabsContent className="mt-6" value="competitors">
          <CompetitorsTab organizationId={org._id} orgSlug={orgSlug} />
        </TabsContent>

        <TabsContent className="mt-6" value="settings">
          <IntelligenceSettings organizationId={org._id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
