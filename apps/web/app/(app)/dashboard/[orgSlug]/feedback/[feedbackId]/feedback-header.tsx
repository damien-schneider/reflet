"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@ctrl-ui/react/ui/avatar";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import {
  ArrowLeft,
  ChatCircle,
  GithubLogo,
  PushPin,
  User,
} from "@phosphor-icons/react";
import Link from "next/link";
import { TagBadge } from "@/components/tag-badge";
import { H1 } from "@/components/ui/typography";
import { CommentTimestamp } from "@/features/feedback/components/feedback-detail/comment-meta";
import { PublicFeedbackVoting } from "@/features/feedback/components/public-feedback-detail/public-feedback-voting";

interface FeedbackHeaderProps {
  assignee?: {
    id: string;
    name?: string | null;
    email?: string;
    image?: string | null;
  } | null;
  commentCount: number;
  createdAt: number;
  githubIssue?: { number: number; url: string } | null;
  hasVoted?: boolean;
  isAdmin: boolean;
  isCreatingGithubIssue?: boolean;
  isPinned?: boolean;
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
  onAssigneeChange: (assigneeId: string) => void;
  onCreateGithubIssue?: () => void;
  onVote: () => void;
  orgSlug: string;
  primaryColor: string;
  status?: { name: string; color: string } | undefined;
  tags?: Array<{ _id: string; name: string; color: string } | null> | null;
  title: string;
  voteCount: number;
}

export function FeedbackHeader({
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
  githubIssue,
  isCreatingGithubIssue,
  onCreateGithubIssue,
}: FeedbackHeaderProps) {
  return (
    <div className="border-b p-6">
      <Link
        className="mb-4 inline-flex items-center text-muted-foreground text-sm hover:text-foreground"
        href={`/dashboard/${orgSlug}`}
      >
        <ArrowLeft className="mr-2 size-4" />
        Back
      </Link>

      <div className="flex gap-4">
        <PublicFeedbackVoting
          hasVoted={hasVoted ?? false}
          onVote={onVote}
          primaryColor={primaryColor}
          voteCount={voteCount}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            {isPinned && (
              <PushPin
                aria-label="Pinned"
                className="mt-1 size-5 shrink-0 text-primary"
                weight="fill"
              />
            )}
            <H1 className="text-balance" variant="page">
              {title}
            </H1>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {status && <TagBadge color={status.color}>{status.name}</TagBadge>}
            {tags?.map(
              (tag) =>
                tag && (
                  <TagBadge color={tag.color} key={tag._id} variant="outline">
                    {tag.name}
                  </TagBadge>
                )
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
            <span className="flex items-center gap-1 tabular-nums">
              <ChatCircle aria-hidden className="size-4" />
              {commentCount} {commentCount === 1 ? "comment" : "comments"}
            </span>
            <CommentTimestamp createdAt={createdAt} />
            <FeedbackAssigneeSelector
              assignee={assignee}
              isAdmin={isAdmin}
              members={members}
              onAssigneeChange={onAssigneeChange}
            />
            <GithubIssueLink
              githubIssue={githubIssue}
              isCreating={isCreatingGithubIssue}
              onCreate={onCreateGithubIssue}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function GithubIssueLink({
  githubIssue,
  isCreating,
  onCreate,
}: {
  githubIssue?: { number: number; url: string } | null;
  isCreating?: boolean;
  onCreate?: () => void;
}) {
  if (githubIssue) {
    return (
      <a
        className="flex items-center gap-1 hover:text-foreground"
        href={githubIssue.url}
        rel="noopener noreferrer"
        target="_blank"
      >
        <GithubLogo aria-hidden className="size-4" />
        <span className="tabular-nums">#{githubIssue.number}</span>
      </a>
    );
  }
  if (!onCreate) {
    return null;
  }
  return (
    <Button
      disabled={isCreating}
      onClick={onCreate}
      size="xs"
      variant="surface"
    >
      <GithubLogo className="size-3.5" />
      {isCreating ? "Creating issue…" : "Send to GitHub"}
    </Button>
  );
}

interface FeedbackAssigneeSelectorProps {
  assignee?: {
    id: string;
    name?: string | null;
    email?: string;
    image?: string | null;
  } | null;
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
  onAssigneeChange: (assigneeId: string) => void;
}

export function FeedbackAssigneeSelector({
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
        <SelectTrigger
          aria-label="Assignee"
          className="w-auto min-w-36"
          size="xs"
        >
          <SelectValue placeholder="Assignee">
            {assignee ? (
              <div className="flex items-center gap-1.5">
                <Avatar className="size-4">
                  <AvatarImage src={assignee.image ?? undefined} />
                  <AvatarFallback className="text-micro">
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
                <Avatar className="size-5">
                  <AvatarImage src={member.user?.image ?? undefined} />
                  <AvatarFallback className="text-micro">
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
      <Avatar className="size-4">
        <AvatarImage src={assignee.image ?? undefined} />
        <AvatarFallback className="text-micro">
          {assignee.name?.charAt(0) ?? "?"}
        </AvatarFallback>
      </Avatar>
      {assignee.name ?? "Assigned"}
    </span>
  );
}
