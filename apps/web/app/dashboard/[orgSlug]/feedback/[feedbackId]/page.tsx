"use client";

import {
  ArrowLeft,
  CaretUp,
  ChatCircle,
  PushPin,
  User,
} from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { use, useCallback } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const membership = useQuery(
    api.members.getMembership,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const isAdmin = membership?.role === "admin" || membership?.role === "owner";
  const members = useQuery(
    api.members.list,
    isAdmin && org?._id ? { organizationId: org._id } : "skip"
  );

  const toggleVote = useMutation(api.votes.toggle);
  const assignFeedback = useMutation(api.feedback_actions.assign);

  const handleVote = useCallback(async () => {
    if (feedbackId) {
      await toggleVote({
        feedbackId: feedbackId as Id<"feedback">,
        voteType: "upvote",
      });
    }
  }, [feedbackId, toggleVote]);

  const handleAssigneeChange = useCallback(
    async (assigneeId: string) => {
      if (!feedbackId) {
        return;
      }
      await assignFeedback({
        feedbackId: feedbackId as Id<"feedback">,
        assigneeId:
          !assigneeId || assigneeId === "unassigned" ? undefined : assigneeId,
      });
    },
    [feedbackId, assignFeedback]
  );

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

interface FeedbackHeaderProps {
  orgSlug: string;
  title: string;
  voteCount: number;
  hasVoted?: boolean;
  isPinned?: boolean;
  primaryColor: string;
  commentCount: number;
  createdAt: number;
  isAdmin: boolean;
  onVote: () => void;
  onAssigneeChange: (assigneeId: string) => void;
  status?: { name: string; color: string } | undefined;
  tags?: Array<{ _id: string; name: string; color: string } | null> | null;
  members:
    | Array<{
        userId: string;
        user?: {
          name?: string | null;
          email?: string | null;
          image?: string | null;
        } | null;
      }>
    | undefined;
  assignee?: {
    id: string;
    name?: string | null;
    email?: string;
    image?: string | null;
  } | null;
}

function FeedbackHeader({
  orgSlug,
  title,
  voteCount,
  hasVoted,
  isPinned,
  primaryColor,
  commentCount,
  createdAt,
  isAdmin,
  onVote,
  onAssigneeChange,
  status,
  tags,
  members,
  assignee,
}: FeedbackHeaderProps) {
  return (
    <div className="border-b p-6">
      <Link
        className="mb-4 inline-flex items-center text-muted-foreground text-sm hover:text-foreground"
        href={`/dashboard/${orgSlug}`}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Link>

      <div className="flex gap-4">
        <button
          className={cn(
            "flex shrink-0 flex-col items-center rounded-lg border p-3 transition-colors",
            hasVoted
              ? "border-primary bg-primary/10 text-primary"
              : "border-border hover:border-primary"
          )}
          onClick={onVote}
          style={
            hasVoted
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
          <span className="font-semibold">{voteCount}</span>
        </button>

        <div className="flex-1">
          <div className="flex items-start gap-2">
            {isPinned && (
              <PushPin
                className="mt-1 h-5 w-5 shrink-0 text-primary"
                weight="fill"
              />
            )}
            <H1 variant="page">{title}</H1>
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
            {tags?.map(
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

          <div className="mt-2 flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
            <span className="flex items-center gap-1">
              <ChatCircle className="h-4 w-4" />
              {commentCount} comments
            </span>
            <span>{formatDistanceToNow(createdAt, { addSuffix: true })}</span>
            <FeedbackAssigneeSelector
              assignee={assignee}
              isAdmin={isAdmin}
              members={members}
              onAssigneeChange={onAssigneeChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface FeedbackAssigneeSelectorProps {
  isAdmin: boolean;
  members:
    | Array<{
        userId: string;
        user?: {
          name?: string | null;
          email?: string | null;
          image?: string | null;
        } | null;
      }>
    | undefined;
  assignee?: {
    id: string;
    name?: string | null;
    email?: string;
    image?: string | null;
  } | null;
  onAssigneeChange: (assigneeId: string) => void;
}

function FeedbackAssigneeSelector({
  isAdmin,
  members,
  assignee,
  onAssigneeChange,
}: FeedbackAssigneeSelectorProps) {
  if (isAdmin && members) {
    return (
      <Select
        onValueChange={(value) => {
          if (value) {
            onAssigneeChange(value);
          }
        }}
        value={assignee?.id ?? "unassigned"}
      >
        <SelectTrigger className="h-7 w-auto min-w-36 gap-2 border-dashed text-sm">
          <SelectValue placeholder="Assignee">
            {assignee ? (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={assignee.image ?? undefined} />
                  <AvatarFallback className="text-[8px]">
                    {assignee.name?.charAt(0) ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <span>{assignee.name ?? assignee.email ?? "Unknown"}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>Assignee</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Unassigned</span>
            </div>
          </SelectItem>
          {members.map((member) => (
            <SelectItem key={member.userId} value={member.userId}>
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={member.user?.image ?? undefined} />
                  <AvatarFallback className="text-[8px]">
                    {member.user?.name?.charAt(0) ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <span>
                  {member.user?.name ?? member.user?.email ?? "Unknown"}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (!assignee) {
    return null;
  }

  return (
    <span className="flex items-center gap-1.5">
      <Avatar className="h-4 w-4">
        <AvatarImage src={assignee.image ?? undefined} />
        <AvatarFallback className="text-[8px]">
          {assignee.name?.charAt(0) ?? "?"}
        </AvatarFallback>
      </Avatar>
      {assignee.name ?? "Assigned"}
    </span>
  );
}
