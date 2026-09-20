"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import {
  Calendar,
  Check,
  Clock,
  DotsThreeVertical,
  Eye,
  EyeSlash,
  GitCommit,
  GithubLogo,
  PencilSimple,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { format } from "date-fns";
import Link from "next/link";
import type * as React from "react";
import { MarkdownRenderer } from "@/components/ui/tiptap/markdown-renderer";
import { cn } from "@/lib/utils";

interface LinkedFeedback {
  _id: Id<"feedback">;
  status?: string;
  title: string;
}

export interface ReleaseData {
  _creationTime: number;
  _id: Id<"releases">;
  commitCount?: number;
  description?: string;
  feedback?: (LinkedFeedback | null)[];
  githubHtmlUrl?: string;
  githubPushErrorType?: string;
  githubPushStatus?: "pending" | "success" | "failed";
  githubReleaseId?: string;
  publishedAt?: number;
  scheduledPublishAt?: number;
  title: string;
  version?: string;
}

interface ReleaseItemProps {
  isAdmin?: boolean;
  onDelete?: () => void;
  onPublish?: () => void;
  onUnpublish?: () => void;
  orgSlug: string;
  release: ReleaseData;
}

export function ReleaseItem({
  release,
  orgSlug,
  isAdmin = false,
  onPublish,
  onUnpublish,
  onDelete,
}: ReleaseItemProps) {
  const isPublished = release.publishedAt !== undefined;
  const scheduledDate =
    isPublished || release.scheduledPublishAt === undefined
      ? null
      : format(release.scheduledPublishAt, "MMM d, h:mm a");
  const publishDate = release.publishedAt
    ? format(release.publishedAt, "MMMM d, yyyy")
    : null;

  return (
    <article className="relative">
      <div
        className={cn(
          "sticky top-0 z-20 -mx-4 px-4 py-3 backdrop-blur-sm",
          "border-transparent border-b bg-background/80",
          "md:-mx-0 md:px-0"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {release.version && (
              <Badge className="px-3 py-1 font-mono text-sm" variant="outline">
                {release.version}
              </Badge>
            )}
            {scheduledDate && (
              <Badge variant="outline">
                <Clock className="mr-1 h-3 w-3" />
                Scheduled <span className="tabular-nums">{scheduledDate}</span>
              </Badge>
            )}
            {!(isPublished || scheduledDate) && (
              <Badge>
                <EyeSlash className="mr-1 h-3 w-3" />
                Draft
              </Badge>
            )}
            {publishDate && (
              <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Calendar className="h-4 w-4" />
                <time
                  dateTime={
                    release.publishedAt
                      ? new Date(release.publishedAt).toISOString()
                      : undefined
                  }
                >
                  {publishDate}
                </time>
              </span>
            )}

            {isPublished && <GitHubStatusIndicator release={release} />}
          </div>

          {isAdmin && (
            <div className="flex items-center gap-1 sm:gap-2">
              <ButtonLink
                render={
                  <Link
                    href={`/dashboard/${orgSlug}/changelog/${release._id}/edit`}
                  />
                }
                size="xs"
                variant="ghost"
              >
                <PencilSimple className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">Edit</span>
              </ButtonLink>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={(props: React.ComponentProps<"button">) => (
                    <Button
                      {...props}
                      aria-label="Release actions"
                      iconOnly
                      variant="ghost"
                    >
                      <DotsThreeVertical className="h-4 w-4" />
                    </Button>
                  )}
                />
                <DropdownMenuContent align="end">
                  {isPublished ? (
                    <DropdownMenuItem onClick={onUnpublish}>
                      <EyeSlash className="mr-2 h-4 w-4" />
                      Unpublish
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={onPublish}>
                      <Eye className="mr-2 h-4 w-4" />
                      Publish
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={onDelete}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      <div className={cn("pt-6 pb-12", !isPublished && "opacity-70")}>
        <h2 className="mb-4 font-semibold text-2xl md:text-3xl">
          {release.title}
        </h2>

        {release.description && (
          <MarkdownRenderer content={release.description} />
        )}

        {release.feedback && release.feedback.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-3 font-medium text-muted-foreground text-sm uppercase tracking-wide">
              Shipped Features
            </h3>
            <ul className="space-y-2">
              {release.feedback
                .filter((item): item is LinkedFeedback => item !== null)
                .map((item) => (
                  <li
                    className="flex items-center gap-2 text-sm"
                    key={item._id}
                  >
                    <Check className="h-4 w-4 shrink-0 text-success-text" />
                    <span className="min-w-0 flex-1">{item.title}</span>
                    {item.status && <FeedbackStatusDot status={item.status} />}
                  </li>
                ))}
            </ul>
          </div>
        )}

        {isAdmin &&
          release.commitCount !== undefined &&
          release.commitCount > 0 && (
            <div className="mt-4 flex items-center gap-1.5 text-muted-foreground text-xs">
              <GitCommit className="h-3.5 w-3.5" />
              <span>
                <span className="tabular-nums">{release.commitCount}</span>{" "}
                commit{release.commitCount === 1 ? "" : "s"} used
              </span>
            </div>
          )}
      </div>
    </article>
  );
}

const STATUS_DOT_COLORS: Record<string, string> = {
  closed: "bg-muted-foreground",
  completed: "bg-success",
  in_progress: "bg-warning",
  open: "bg-chart-2",
  planned: "bg-chart-4",
  under_review: "bg-chart-3",
};

const STATUS_LABELS: Record<string, string> = {
  closed: "Closed",
  completed: "Completed",
  in_progress: "In Progress",
  open: "Open",
  planned: "Planned",
  under_review: "Under Review",
};

function FeedbackStatusDot({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground text-xs">
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-2 w-2 shrink-0 rounded-full",
          STATUS_DOT_COLORS[status] ?? "bg-muted-foreground"
        )}
      />
      {label}
    </span>
  );
}

function GitHubStatusIndicator({ release }: { release: ReleaseData }) {
  if (release.githubReleaseId && release.githubHtmlUrl) {
    return (
      <a
        aria-label="View release on GitHub"
        className="flex items-center gap-1 text-success-text text-xs"
        href={release.githubHtmlUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        <GithubLogo className="h-3.5 w-3.5" />
        <Check className="h-3 w-3" />
      </a>
    );
  }

  if (release.githubPushStatus === "pending") {
    return (
      <span className="flex items-center gap-1 text-muted-foreground text-xs">
        <GithubLogo className="h-3.5 w-3.5" />
        <Spinner className="h-3 w-3" />
        <span className="sr-only">Pushing to GitHub</span>
      </span>
    );
  }

  if (release.githubPushStatus === "failed") {
    return (
      <span className="flex items-center gap-1 text-destructive-text text-xs">
        <GithubLogo className="h-3.5 w-3.5" />
        <WarningCircle className="h-3 w-3" />
        <span className="sr-only">Push to GitHub failed</span>
      </span>
    );
  }

  return null;
}
