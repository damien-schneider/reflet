"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Card } from "@ctrl-ui/react/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import {
  PageBody,
  PageDescription,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { CaretUp } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { use } from "react";
import { TagBadge } from "@/components/tag-badge";
import { getTagSwatchClass } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

const MAX_CARD_TAGS = 2;
const SKELETON_LANES = ["lane-a", "lane-b", "lane-c"] as const;

interface RoadmapTag {
  _id: string;
  color: string;
  isRoadmapLane?: boolean;
  name: string;
}

interface RoadmapFeedback {
  _id: string;
  tags?: Array<RoadmapTag | null>;
  title: string;
  voteCount: number;
}

function LanesSkeleton() {
  return (
    <div aria-busy className="flex gap-4 overflow-hidden pb-4">
      {SKELETON_LANES.map((key) => (
        <div
          className="grid w-80 shrink-0 content-start gap-3 rounded-lg border bg-muted/30 p-4"
          key={key}
        >
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ))}
    </div>
  );
}

function RoadmapCard({
  feedback,
  href,
}: {
  feedback: RoadmapFeedback;
  href: string;
}) {
  const tags =
    feedback.tags
      ?.filter((t): t is RoadmapTag => t !== null && !t.isRoadmapLane)
      .slice(0, MAX_CARD_TAGS) ?? [];

  return (
    <Card className="relative gap-2 p-3 hover:bg-accent/50">
      <h3 className="text-pretty font-medium text-sm">
        <Link
          className="outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:ring-2 focus-visible:after:ring-ring"
          href={href}
        >
          {feedback.title}
        </Link>
      </h3>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <TagBadge color={tag.color} key={tag._id} size="sm">
              {tag.name}
            </TagBadge>
          ))}
        </div>
        <span className="flex items-center gap-1 text-muted-foreground text-xs">
          <CaretUp aria-hidden className="size-3" />
          <span className="tabular-nums">{feedback.voteCount}</span>
          <span className="sr-only">votes</span>
        </span>
      </div>
    </Card>
  );
}

function RoadmapBoard({ orgSlug }: { orgSlug: string }) {
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const roadmapConfig = useQuery(
    api.organizations.tag_manager.getRoadmapConfig,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const roadmapFeedback = useQuery(
    api.feedback.roadmap.list,
    org?._id ? { organizationId: org._id } : "skip"
  );

  if (org === null) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Roadmap not found</EmptyTitle>
          <EmptyDescription>Check the link and try again.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (!(roadmapConfig && roadmapFeedback)) {
    return <LanesSkeleton />;
  }

  if (roadmapConfig.lanes.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No roadmap yet</EmptyTitle>
          <EmptyDescription>
            Planned work will show up here once the team publishes it.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto overscroll-x-contain pb-4">
      {roadmapConfig.lanes.map((lane) => {
        const items = roadmapFeedback.filter((f) =>
          f?.tags?.some((t) => t?._id === lane._id)
        );
        return (
          <section
            aria-label={lane.name}
            className="w-80 shrink-0 rounded-lg border bg-muted/30 p-4"
            key={lane._id}
          >
            <div className="mb-4 flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "size-2.5 rounded-full",
                  getTagSwatchClass(lane.color)
                )}
              />
              <h2 className="font-semibold text-sm">{lane.name}</h2>
              <Badge className="ml-auto tabular-nums" size="sm">
                {items.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {items.map((feedback) => (
                <RoadmapCard
                  feedback={feedback}
                  href={`/${orgSlug}/feedback/${feedback._id}`}
                  key={feedback._id}
                />
              ))}
              {items.length === 0 && (
                <p className="py-4 text-center text-muted-foreground text-sm">
                  Nothing here yet
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function PublicRoadmapPageClient({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);

  return (
    <PageLayout scroll="page">
      <PageHeader>
        <PageTitle>Roadmap</PageTitle>
        <PageDescription>
          What we’re working on and what’s coming next.
        </PageDescription>
      </PageHeader>
      <PageBody>
        <RoadmapBoard orgSlug={orgSlug} />
      </PageBody>
    </PageLayout>
  );
}
