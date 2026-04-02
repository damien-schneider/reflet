"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { use } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { H2, Muted } from "@/components/ui/typography";

import { FeedbackHeader } from "./_components/feedback-header";

export default function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; feedbackId: Id<"feedback"> }>;
}) {
  const { orgSlug, feedbackId } = use(params);

  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const feedback = useQuery(
    api.feedback.queries.get,
    feedbackId ? { id: feedbackId } : "skip"
  );
  const statuses = useQuery(
    api.organizations.statuses.list,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const comments = useQuery(
    api.feedback.comments.list,
    feedbackId ? { feedbackId } : "skip"
  );
  const membership = useQuery(
    api.organizations.members.getMembership,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const isAdmin = membership?.role === "admin" || membership?.role === "owner";
  const members = useQuery(
    api.organizations.members.list,
    isAdmin && org?._id ? { organizationId: org._id } : "skip"
  );

  const toggleVote = useMutation(api.feedback.votes.toggle);
  const assignFeedback = useMutation(api.feedback.actions.assign);

  const handleVote = async () => {
    if (feedbackId) {
      await toggleVote({
        feedbackId,
        voteType: "upvote",
      });
    }
  };

  const handleAssigneeChange = async (assigneeId: string) => {
    if (!feedbackId) {
      return;
    }
    await assignFeedback({
      feedbackId,
      assigneeId:
        !assigneeId || assigneeId === "unassigned" ? undefined : assigneeId,
    });
  };

  if (!org) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <H2 variant="card">Organization not found</H2>
          <Muted className="mt-2">
            The organization you&apos;re looking for doesn&apos;t exist.
          </Muted>
        </div>
      </div>
    );
  }

  if (feedback === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <H2 variant="card">Feedback not found</H2>
          <Muted className="mt-2">
            The feedback you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have access.
          </Muted>
          <Link href={`/dashboard/${orgSlug}`}>
            <Button className="mt-4" variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (feedback === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Muted>Loading...</Muted>
      </div>
    );
  }

  const status = statuses?.find((s) => s._id === feedback.organizationStatusId);

  return (
    <div className="flex h-full flex-col">
      <FeedbackHeader
        assignee={feedback.assignee}
        commentCount={feedback.commentCount ?? 0}
        createdAt={feedback.createdAt}
        hasVoted={feedback.hasVoted}
        isAdmin={isAdmin}
        isPinned={feedback.isPinned}
        members={members}
        onAssigneeChange={handleAssigneeChange}
        onVote={handleVote}
        orgSlug={orgSlug}
        primaryColor={org.primaryColor ?? "#6366f1"}
        status={status}
        tags={feedback.tags}
        title={feedback.title}
        voteCount={feedback.voteCount ?? 0}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl">
          {feedback.description && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <p className="whitespace-pre-wrap">{feedback.description}</p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <h2 className="font-semibold text-lg">
              Comments ({comments?.length ?? 0})
            </h2>

            {comments && comments.length > 0 ? (
              comments.map((comment) => (
                <Card key={comment._id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {comment.author?.name ?? "Anonymous"}
                      </span>
                      <Muted>
                        {formatDistanceToNow(comment.createdAt, {
                          addSuffix: true,
                        })}
                      </Muted>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{comment.body}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Muted>No comments yet. Be the first to comment.</Muted>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
