"use client";

import { ArrowLeft, CaretUp, ChatCircle, PushPin } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { use } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { H1, H2, Muted } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

export default function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; feedbackId: string }>;
}) {
  const { orgSlug, feedbackId } = use(params);

  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const feedback = useQuery(
    api.feedback.get,
    feedbackId ? { id: feedbackId as Id<"feedback"> } : "skip"
  );
  const statuses = useQuery(
    api.organization_statuses.list,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const comments = useQuery(
    api.comments.list,
    feedbackId ? { feedbackId: feedbackId as Id<"feedback"> } : "skip"
  );

  const toggleVote = useMutation(api.votes.toggle);

  const handleVote = async () => {
    if (feedbackId) {
      await toggleVote({
        feedbackId: feedbackId as Id<"feedback">,
        voteType: "upvote",
      });
    }
  };

  if (!org) {
    return (
      <div className="flex h-full items-center justify-center">
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
      <div className="flex h-full items-center justify-center">
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
      <div className="flex h-full items-center justify-center">
        <Muted>Loading...</Muted>
      </div>
    );
  }

  const status = statuses?.find((s) => s._id === feedback.organizationStatusId);
  const primaryColor = org.primaryColor ?? "#6366f1";

  return (
    <div className="flex h-full flex-col">
      {/* Header with back button */}
      <div className="border-b p-6">
        <Link
          className="mb-4 inline-flex items-center text-muted-foreground text-sm hover:text-foreground"
          href={`/dashboard/${orgSlug}`}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>

        <div className="flex gap-4">
          {/* Vote button */}
          <button
            className={cn(
              "flex shrink-0 flex-col items-center rounded-lg border p-3 transition-colors",
              feedback.hasVoted
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary"
            )}
            onClick={handleVote}
            style={
              feedback.hasVoted
                ? {
                    borderColor: primaryColor,
                    backgroundColor: `${primaryColor}15`,
                    color: primaryColor,
                  }
                : undefined
            }
            type="button"
          >
            <CaretUp className="h-5 w-5" />
            <span className="font-semibold">{feedback.voteCount ?? 0}</span>
          </button>

          {/* Title and meta */}
          <div className="flex-1">
            <div className="flex items-start gap-2">
              {feedback.isPinned && (
                <PushPin
                  className="mt-1 h-5 w-5 shrink-0 text-primary"
                  weight="fill"
                />
              )}
              <H1 variant="page">{feedback.title}</H1>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {status && (
                <Badge
                  className="font-normal"
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
              {feedback.tags?.map(
                (tag) =>
                  tag && (
                    <Badge
                      className="font-normal"
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

            <div className="mt-2 flex items-center gap-4 text-muted-foreground text-sm">
              <span className="flex items-center gap-1">
                <ChatCircle className="h-4 w-4" />
                {feedback.commentCount ?? 0} comments
              </span>
              <span>
                {formatDistanceToNow(feedback.createdAt, { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl">
          {/* Description */}
          {feedback.description && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <p className="whitespace-pre-wrap">{feedback.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Comments section */}
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
