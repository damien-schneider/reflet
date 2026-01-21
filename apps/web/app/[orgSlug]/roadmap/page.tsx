"use client";

import { CaretUp as ChevronUp } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { use } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function PublicRoadmapPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const roadmapConfig = useQuery(
    api.tag_manager.getRoadmapConfig,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const roadmapFeedback = useQuery(
    api.feedback_roadmap.list,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  if (!(org && roadmapConfig)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  const primaryColor = org.primaryColor ?? "#3b82f6";
  const roadmapLanes = roadmapConfig.lanes || [];
  const allFeedback = roadmapFeedback || [];

  if (roadmapLanes.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-12">
          <h1 className="font-bold text-2xl">Roadmap</h1>
          <p className="mt-2 text-muted-foreground">
            No roadmap has been configured yet.
          </p>
        </div>
      </div>
    );
  }

  const feedbackByLane = roadmapLanes.reduce(
    (acc, lane) => {
      acc[lane._id] = allFeedback.filter((f) =>
        f?.tags?.filter(Boolean).some((t) => t?._id === lane._id)
      );
      return acc;
    },
    {} as Record<string, typeof allFeedback>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="font-bold text-3xl">Roadmap</h1>
        <p className="mt-2 text-muted-foreground">
          See what we&apos;re working on and what&apos;s coming next.
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {roadmapLanes.map((lane) => (
          <div
            className="w-80 flex-shrink-0 rounded-lg border bg-muted/30 p-4"
            key={lane._id}
          >
            <div className="mb-4 flex items-center gap-2">
              <div
                className="h-3 w-3 rounded"
                style={{ backgroundColor: lane.color }}
              />
              <h3 className="font-semibold">{lane.name}</h3>
              <Badge className="ml-auto" variant="secondary">
                {feedbackByLane[lane._id]?.length || 0}
              </Badge>
            </div>
            <div className="space-y-3">
              {feedbackByLane[lane._id]?.map((feedback) => (
                <RoadmapCard
                  feedback={feedback}
                  key={feedback._id}
                  primaryColor={primaryColor}
                />
              ))}
              {(!feedbackByLane[lane._id] ||
                feedbackByLane[lane._id].length === 0) && (
                <p className="py-4 text-center text-muted-foreground text-sm">
                  No items
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface RoadmapCardProps {
  feedback: {
    _id: string;
    title: string;
    voteCount: number;
    tags?: Array<{
      _id: string;
      name: string;
      color: string;
      isRoadmapLane?: boolean;
    } | null>;
  };
  primaryColor: string;
}

function RoadmapCard({ feedback, primaryColor }: RoadmapCardProps) {
  const nonLaneTags =
    feedback.tags
      ?.filter(
        (t): t is NonNullable<typeof t> => t !== null && !t.isRoadmapLane
      )
      ?.slice(0, 2) ?? [];

  return (
    <Card>
      <CardContent className="p-3">
        <h4 className="font-medium text-sm">{feedback.title}</h4>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {nonLaneTags.map((tag) => (
              <Badge
                className="text-xs"
                key={tag._id}
                style={{ borderColor: tag.color, color: tag.color }}
                variant="outline"
              >
                {tag.name}
              </Badge>
            ))}
          </div>
          <div
            className="flex items-center gap-1 text-xs"
            style={{ color: primaryColor }}
          >
            <ChevronUp className="h-3 w-3" />
            {feedback.voteCount}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
