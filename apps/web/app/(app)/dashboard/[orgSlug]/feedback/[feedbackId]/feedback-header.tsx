"use client";

import {
  ArrowLeft,
  CaretUp,
  ChatCircle,
  PushPin,
  User,
} from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { H1 } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

interface FeedbackHeaderProps {
  assignee?: {
    id: string;
    name?: string | null;
    email?: string;
    image?: string | null;
  } | null;
  commentCount: number;
  createdAt: number;
  hasVoted?: boolean;
  isAdmin: boolean;
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
                  backgroundColor: `${primaryColor}15`,
                  borderColor: primaryColor,
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
                  borderColor: `${status.color}30`,
                  color: status.color,
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
                      borderColor: `${tag.color}30`,
                      color: tag.color,
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
