"use client";

import { ButtonLink } from "@ctrl-ui/react/ui/button";
import { Card, CardContent, CardHeader } from "@ctrl-ui/react/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { use } from "react";
import { Muted } from "@/components/ui/typography";
import { OrgNotFound } from "@/features/dashboard/components/org-not-found";
import { useCreateGithubIssue } from "@/features/github/hooks/use-create-github-issue";
import { DEFAULT_PRIMARY_COLOR } from "@/lib/branding";
import { FeedbackHeader } from "./feedback-header";

export default function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; feedbackId: Id<"feedback"> }>;
}) {
  const { orgSlug, feedbackId } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  if (org === undefined) {
    return <FeedbackDetailSkeleton />;
  }

  if (org === null) {
    return <OrgNotFound />;
  }

  return <FeedbackDetail feedbackId={feedbackId} org={org} orgSlug={orgSlug} />;
}

function FeedbackDetail({
  feedbackId,
  org,
  orgSlug,
}: {
  feedbackId: Id<"feedback">;
  org: Doc<"organizations">;
  orgSlug: string;
}) {
  const feedback = useQuery(api.feedback.queries.get, { id: feedbackId });
  const comments = useQuery(api.feedback.comments.list, { feedbackId });

  if (feedback === null) {
    return <FeedbackNotFound orgSlug={orgSlug} />;
  }

  if (feedback === undefined) {
    return <FeedbackDetailSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      <FeedbackDetailHeader feedback={feedback} org={org} orgSlug={orgSlug} />

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl">
          {feedback.description && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <p className="max-w-prose whitespace-pre-wrap text-pretty">
                  {feedback.description}
                </p>
              </CardContent>
            </Card>
          )}

          <FeedbackComments comments={comments} />
        </div>
      </div>
    </div>
  );
}

function useOrgTriageData(organizationId: Id<"organizations">) {
  const statuses = useQuery(api.organizations.statuses.list, {
    organizationId,
  });
  const membership = useQuery(api.organizations.members.getMembership, {
    organizationId,
  });
  const isAdmin = membership?.role === "admin" || membership?.role === "owner";
  const members = useQuery(
    api.organizations.members.list,
    isAdmin ? { organizationId } : "skip"
  );
  return { isAdmin, members, statuses };
}

function FeedbackDetailHeader({
  feedback,
  org,
  orgSlug,
}: {
  feedback: NonNullable<FunctionReturnType<typeof api.feedback.queries.get>>;
  org: Doc<"organizations">;
  orgSlug: string;
}) {
  const organizationId = org._id;
  const feedbackId = feedback._id;
  const { isAdmin, members, statuses } = useOrgTriageData(organizationId);
  const toggleVote = useMutation(api.feedback.votes.toggle);
  const assignFeedback = useMutation(api.feedback.triage_actions.assign);
  const { isCreatingGithubIssue, onCreateGithubIssue } = useCreateGithubIssue({
    feedbackId,
    organizationId: isAdmin ? organizationId : undefined,
  });

  const status = statuses?.find((s) => s._id === feedback.organizationStatusId);
  const githubIssue =
    feedback.githubHtmlUrl && feedback.githubIssueNumber !== undefined
      ? { number: feedback.githubIssueNumber, url: feedback.githubHtmlUrl }
      : null;

  return (
    <FeedbackHeader
      assignee={feedback.assignee}
      commentCount={feedback.commentCount ?? 0}
      createdAt={feedback.createdAt}
      githubIssue={githubIssue}
      hasVoted={feedback.hasVoted}
      isAdmin={isAdmin}
      isCreatingGithubIssue={isCreatingGithubIssue}
      isPinned={feedback.isPinned}
      members={members}
      onAssigneeChange={(assigneeId) =>
        assignFeedback({
          assigneeId:
            !assigneeId || assigneeId === "unassigned" ? undefined : assigneeId,
          feedbackId,
        })
      }
      onCreateGithubIssue={onCreateGithubIssue}
      onVote={() => toggleVote({ feedbackId, voteType: "upvote" })}
      orgSlug={orgSlug}
      primaryColor={org.primaryColor ?? DEFAULT_PRIMARY_COLOR}
      status={status}
      tags={feedback.tags}
      title={feedback.title}
      voteCount={feedback.voteCount ?? 0}
    />
  );
}

function FeedbackNotFound({ orgSlug }: { orgSlug: string }) {
  return (
    <Empty className="min-h-[50vh]">
      <EmptyHeader>
        <EmptyTitle aria-level={1} role="heading">
          Feedback not found
        </EmptyTitle>
        <EmptyDescription>
          It may have been deleted, or you don’t have access to it.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <ButtonLink
          render={<Link href={`/dashboard/${orgSlug}`} />}
          variant="surface"
        >
          Back to feedback
        </ButtonLink>
      </EmptyContent>
    </Empty>
  );
}

function FeedbackComments({
  comments,
}: {
  comments: FunctionReturnType<typeof api.feedback.comments.list> | undefined;
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-lg tabular-nums">
        {comments === undefined ? "Comments" : `Comments (${comments.length})`}
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
            <Muted>No comments yet.</Muted>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FeedbackDetailSkeleton() {
  return (
    <div aria-busy="true" className="flex h-full flex-col">
      <span className="sr-only">Loading feedback…</span>
      <div className="flex items-start gap-4 border-b p-6">
        <Skeleton className="h-16 w-12" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl space-y-4 p-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
