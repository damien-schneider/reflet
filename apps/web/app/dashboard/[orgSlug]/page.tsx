"use client";

import {
  ArrowUpRight,
  CaretUp,
  ChatCircle,
  PushPin,
  TrendUp,
  Users,
} from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { use, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { H1, H2, Muted } from "@/components/ui/typography";
import {
  BoardViewToggle,
  type BoardView as BoardViewType,
} from "@/features/feedback/components/board-view-toggle";
import { SubmitFeedbackDialog } from "@/features/feedback/components/submit-feedback-dialog";
import { cn } from "@/lib/utils";

type FeedbackItem = NonNullable<
  ReturnType<typeof useQuery<typeof api.feedback_list.listByOrganization>>
>[number];

type StatusItem = NonNullable<
  ReturnType<typeof useQuery<typeof api.organization_statuses.list>>
>[number];

type TagItem = NonNullable<
  ReturnType<typeof useQuery<typeof api.tags.list>>
>[number];

interface FeedbackCardProps {
  item: FeedbackItem;
  status: StatusItem | undefined;
  orgSlug: string;
  primaryColor: string;
  onVote: (feedbackId: Id<"feedback">) => void;
}

function FeedbackCard({
  item,
  status,
  orgSlug,
  primaryColor,
  onVote,
}: FeedbackCardProps) {
  return (
    <Link
      className="block"
      href={`/dashboard/${orgSlug}/feedback/${item._id}`}
      key={item._id}
    >
      <Card className="transition-all hover:border-primary/50 hover:shadow-sm">
        <CardContent className="flex gap-4 p-4">
          <button
            className={cn(
              "flex shrink-0 flex-col items-center rounded-lg border p-2 transition-colors",
              item.hasVoted
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary"
            )}
            onClick={(e) => {
              e.preventDefault();
              onVote(item._id as Id<"feedback">);
            }}
            style={
              item.hasVoted
                ? {
                    borderColor: primaryColor,
                    backgroundColor: `${primaryColor}15`,
                    color: primaryColor,
                  }
                : undefined
            }
            type="button"
          >
            <CaretUp className="h-4 w-4" />
            <span className="font-semibold text-sm">{item.voteCount ?? 0}</span>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              {item.isPinned && (
                <PushPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  weight="fill"
                />
              )}
              <h3 className="font-semibold">{item.title}</h3>
            </div>

            {item.description && (
              <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
                {item.description}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {status && (
                <Badge
                  className="font-normal text-xs"
                  style={{
                    backgroundColor: `${status.color}15`,
                    color: status.color,
                    borderColor: `${status.color}30`,
                  }}
                  variant="outline"
                >
                  {status.name}
                </Badge>
              )}
              {item.tags?.map(
                (tag) =>
                  tag && (
                    <Badge
                      className="font-normal text-xs"
                      key={tag._id}
                      style={{
                        backgroundColor: `${tag.color}15`,
                        color: tag.color,
                        borderColor: `${tag.color}30`,
                      }}
                      variant="outline"
                    >
                      {tag.name}
                    </Badge>
                  )
              )}
            </div>

            <div className="mt-2 flex items-center gap-4 text-muted-foreground text-xs">
              <span className="flex items-center gap-1">
                <ChatCircle className="h-3.5 w-3.5" />
                {item.commentCount ?? 0}
              </span>
              <span>
                {formatDistanceToNow(item.createdAt, { addSuffix: true })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

interface RoadmapLaneProps {
  lane: TagItem;
  feedback: FeedbackItem[] | undefined;
  orgSlug: string;
}

interface StatsCardsProps {
  feedbackCount: number;
  membersCount: number;
  totalVotes: number;
  subscriptionTier: string;
}

function StatsCards({
  feedbackCount,
  membersCount,
  totalVotes,
  subscriptionTier,
}: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">Total Feedback</CardTitle>
          <ChatCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl">{feedbackCount}</div>
          <p className="text-muted-foreground text-xs">All feedback items</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">Team Members</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl">{membersCount}</div>
          <p className="text-muted-foreground text-xs">
            {subscriptionTier === "free" ? "3 max (Free)" : "10 max (Pro)"}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">Total Votes</CardTitle>
          <TrendUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl">{totalVotes}</div>
          <p className="text-muted-foreground text-xs">Across all feedback</p>
        </CardContent>
      </Card>
    </div>
  );
}

function RoadmapLane({ lane, feedback, orgSlug }: RoadmapLaneProps) {
  const laneFeedback = feedback?.filter((f) =>
    f.tags?.some((t) => t?._id === lane._id)
  );

  return (
    <div className="w-72 shrink-0 rounded-lg border bg-muted/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: lane.color }}
        />
        <h3 className="font-medium">{lane.name}</h3>
        <Badge className="ml-auto" variant="secondary">
          {laneFeedback?.length ?? 0}
        </Badge>
      </div>
      <div className="space-y-2">
        {laneFeedback?.map((item) => (
          <Link
            href={`/dashboard/${orgSlug}/feedback/${item._id}`}
            key={item._id}
          >
            <Card className="p-3 transition-all hover:border-primary/50">
              <h4 className="font-medium text-sm">{item.title}</h4>
              <div className="mt-2 flex items-center gap-2 text-muted-foreground text-xs">
                <CaretUp className="h-3 w-3" />
                <span>{item.voteCount ?? 0}</span>
                <ChatCircle className="ml-2 h-3 w-3" />
                <span>{item.commentCount ?? 0}</span>
              </div>
            </Card>
          </Link>
        ))}
        {(!laneFeedback || laneFeedback.length === 0) && (
          <p className="py-4 text-center text-muted-foreground text-sm">
            No items
          </p>
        )}
      </div>
    </div>
  );
}

export default function OrgDashboard({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const stats = useQuery(
    api.organizations_actions.getStats,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  const [view, setView] = useState<BoardViewType>("feed");
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [newFeedback, setNewFeedback] = useState({
    title: "",
    description: "",
    email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createFeedback = useMutation(api.feedback.create);
  const toggleVote = useMutation(api.votes.toggle);

  const feedback = useQuery(
    api.feedback_list.listByOrganization,
    org?._id
      ? {
          organizationId: org._id as Id<"organizations">,
          sortBy: "votes",
          limit: 50,
        }
      : "skip"
  );

  const tags = useQuery(
    api.tags.list,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  const statuses = useQuery(
    api.organization_statuses.list,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  const roadmapLanes = tags?.filter((t) => t.isRoadmapLane) ?? [];

  const handleSubmitFeedback = async () => {
    if (!(org?._id && newFeedback.title.trim())) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createFeedback({
        organizationId: org._id as Id<"organizations">,
        title: newFeedback.title,
        description: newFeedback.description,
      });
      setShowSubmitDialog(false);
      setNewFeedback({ title: "", description: "", email: "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (feedbackId: Id<"feedback">) => {
    await toggleVote({ feedbackId, voteType: "upvote" });
  };

  if (!org) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <H2 variant="card">Organization not found</H2>
          <Muted className="mt-2">
            The organization you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have access.
          </Muted>
        </div>
      </div>
    );
  }

  const primaryColor = org.primaryColor ?? "#6366f1";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <H1 variant="page">{org.name}</H1>
            <Muted>{org.isPublic ? "Public" : "Private"} organization</Muted>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={org.subscriptionTier === "pro" ? "default" : "secondary"}
            >
              {org.subscriptionTier === "pro" ? "Pro" : "Free"}
            </Badge>
            {org.isPublic && (
              <Link href={`/${orgSlug}`} target="_blank">
                <Button size="sm" variant="outline">
                  View public page
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="border-b p-6">
        <StatsCards
          feedbackCount={stats?.feedbackCount ?? 0}
          membersCount={stats?.membersCount ?? 0}
          subscriptionTier={org.subscriptionTier}
          totalVotes={
            feedback?.reduce((sum, f) => sum + (f.voteCount ?? 0), 0) ?? 0
          }
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <BoardViewToggle onChange={setView} view={view} />
        <Button onClick={() => setShowSubmitDialog(true)} size="sm">
          Submit Feedback
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {view === "feed" ? (
          <div className="space-y-4">
            {feedback && feedback.length > 0 ? (
              feedback.map((item) => (
                <FeedbackCard
                  item={item}
                  key={item._id}
                  onVote={handleVote}
                  orgSlug={orgSlug}
                  primaryColor={primaryColor}
                  status={statuses?.find(
                    (s) => s._id === item.organizationStatusId
                  )}
                />
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    No feedback yet. Submit your first feedback to get started.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {roadmapLanes.length > 0 ? (
              roadmapLanes.map((lane) => (
                <RoadmapLane
                  feedback={feedback}
                  key={lane._id}
                  lane={lane}
                  orgSlug={orgSlug}
                />
              ))
            ) : (
              <Card className="flex-1">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    No roadmap lanes configured. Create tags with &quot;Is
                    Roadmap Lane&quot; enabled in Settings &gt; Tags.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Submit Dialog */}
      <SubmitFeedbackDialog
        feedback={newFeedback}
        isMember={true}
        isOpen={showSubmitDialog}
        isSubmitting={isSubmitting}
        onFeedbackChange={setNewFeedback}
        onOpenChange={setShowSubmitDialog}
        onSubmit={handleSubmitFeedback}
      />
    </div>
  );
}
