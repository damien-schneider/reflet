"use client";

import {
  ArrowUpRight,
  ChatCircle,
  TrendUp,
  Users,
} from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
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
import { FeedbackCardWithMorphingDialog } from "@/features/feedback/components/feedback-card-with-morphing-dialog";
import { RoadmapKanban } from "@/features/feedback/components/roadmap-kanban";
import { SubmitFeedbackDialog } from "@/features/feedback/components/submit-feedback-dialog";

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
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Total Feedback
              </CardTitle>
              <ChatCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {stats?.feedbackCount ?? 0}
              </div>
              <p className="text-muted-foreground text-xs">
                All feedback items
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Team Members
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {stats?.membersCount ?? 0}
              </div>
              <p className="text-muted-foreground text-xs">
                {org.subscriptionTier === "free"
                  ? "3 max (Free)"
                  : "10 max (Pro)"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Total Votes</CardTitle>
              <TrendUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {feedback?.reduce((sum, f) => sum + (f.voteCount ?? 0), 0) ?? 0}
              </div>
              <p className="text-muted-foreground text-xs">
                Across all feedback
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <BoardViewToggle onViewChange={setView} view={view} />
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
                <FeedbackCardWithMorphingDialog
                  _id={item._id as Id<"feedback">}
                  basePath={`/dashboard/${orgSlug}`}
                  commentCount={item.commentCount}
                  createdAt={item.createdAt}
                  description={item.description}
                  hasVoted={item.hasVoted}
                  isAuthenticated={true}
                  isPinned={item.isPinned}
                  key={item._id}
                  organizationStatusId={item.organizationStatusId}
                  primaryColor={org.primaryColor ?? "#6366f1"}
                  tags={item.tags}
                  title={item.title}
                  userVoteType={item.userVoteType}
                  voteCount={item.voteCount}
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
          <RoadmapKanban
            basePath={`/dashboard/${orgSlug}`}
            lanes={roadmapLanes.map((lane) => ({
              id: lane._id,
              name: lane.name,
              color: lane.color,
            }))}
            organizationId={org._id as Id<"organizations">}
            primaryColor={org.primaryColor ?? "#6366f1"}
          />
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
