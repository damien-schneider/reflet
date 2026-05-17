"use client";

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
  Spinner,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import {
  FEEDBACK_STATUS_DOT_COLORS,
  FEEDBACK_STATUS_LABELS,
} from "@reflet/ui/feedback-status-colors";
import Link from "next/link";
import type * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListSeparator,
  DropdownListTrigger,
} from "@/components/ui/dropdown-menu";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { cn } from "@/lib/utils";

type LinkedFeedback = Pick<Doc<"feedback">, "_id" | "title"> & {
  status?: string;
};

export type ReleaseData = Pick<
  Doc<"releases">,
  | "_creationTime"
  | "_id"
  | "description"
  | "githubHtmlUrl"
  | "githubPushErrorType"
  | "githubPushStatus"
  | "githubReleaseId"
  | "publishedAt"
  | "scheduledPublishAt"
  | "title"
  | "version"
> & {
  commitCount?: number;
  feedback?: (LinkedFeedback | null)[];
};

interface ReleaseItemProps {
  isAdmin?: boolean;
  onDelete?: () => void;
  onPublish?: () => void;
  onUnpublish?: () => void;
  orgSlug: string;
  release: ReleaseData;
}

const PUBLISHED_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

const SCHEDULED_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  timeZone: "UTC",
});

function formatPublishedDate(timestamp: number) {
  return PUBLISHED_DATE_FORMATTER.format(timestamp);
}

function formatScheduledDate(timestamp: number) {
  return SCHEDULED_DATE_FORMATTER.format(timestamp);
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
  const isScheduled = !isPublished && release.scheduledPublishAt !== undefined;
  const publishDate = release.publishedAt
    ? formatPublishedDate(release.publishedAt)
    : null;
  const linkedFeedback =
    release.feedback?.reduce<LinkedFeedback[]>((items, item) => {
      if (item !== null) {
        items.push(item);
      }
      return items;
    }, []) ?? [];

  return (
    <article className="relative">
      {/* Sticky version header */}
      <div
        className={cn(
          "sticky top-0 z-10 -mx-4 px-4 py-3 backdrop-blur-sm",
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
            {isScheduled && (
              <Badge
                className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                variant="outline"
              >
                <Clock className="mr-1 size-3" />
                Scheduled{" "}
                {formatScheduledDate(release.scheduledPublishAt as number)}
              </Badge>
            )}
            {!(isPublished || isScheduled) && (
              <Badge variant="secondary">
                <EyeSlash className="mr-1 size-3" />
                Draft
              </Badge>
            )}
            {publishDate && (
              <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Calendar className="size-4" />
                <time>{publishDate}</time>
              </span>
            )}

            {/* GitHub status indicator */}
            {isPublished && <GitHubStatusIndicator release={release} />}
          </div>

          {/* Admin actions */}
          {isAdmin && (
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href={`/dashboard/${orgSlug}/changelog/${release._id}/edit`}
              >
                <Button size="sm" variant="ghost">
                  <PencilSimple className="size-4" />
                  <span className="ml-1.5 hidden sm:inline">Edit</span>
                </Button>
              </Link>
              <DropdownList>
                <DropdownListTrigger
                  render={(props: React.ComponentProps<"button">) => (
                    <Button {...props} size="icon" variant="ghost">
                      <DotsThreeVertical className="size-4" />
                    </Button>
                  )}
                />
                <DropdownListContent align="end">
                  {isPublished ? (
                    <DropdownListItem onClick={onUnpublish}>
                      <EyeSlash className="mr-2 size-4" />
                      Unpublish
                    </DropdownListItem>
                  ) : (
                    <DropdownListItem onClick={onPublish}>
                      <Eye className="mr-2 size-4" />
                      Publish
                    </DropdownListItem>
                  )}
                  <DropdownListSeparator />
                  <DropdownListItem
                    className="text-destructive"
                    onClick={onDelete}
                  >
                    <Trash className="mr-2 size-4" />
                    Delete
                  </DropdownListItem>
                </DropdownListContent>
              </DropdownList>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={cn("pt-6 pb-12", !isPublished && "opacity-70")}>
        <h2 className="mb-4 font-semibold text-2xl md:text-3xl">
          {release.title}
        </h2>

        {release.description && (
          <TiptapMarkdownEditor
            editable={false}
            minimal
            value={release.description}
          />
        )}

        {/* Shipped features */}
        {linkedFeedback.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-3 font-medium text-muted-foreground text-sm uppercase tracking-wide">
              Shipped Features
            </h3>
            <ul className="space-y-2">
              {linkedFeedback.map((item) => (
                <li className="flex items-center gap-2 text-sm" key={item._id}>
                  <Check className="size-4 shrink-0 text-olive-500" />
                  <span className="min-w-0 flex-1">{item.title}</span>
                  {item.status && <FeedbackStatusDot status={item.status} />}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Commit count - admin only */}
        {isAdmin &&
          release.commitCount !== undefined &&
          release.commitCount > 0 && (
            <div className="mt-4 flex items-center gap-1.5 text-muted-foreground text-xs">
              <GitCommit className="size-3.5" />
              <span>
                {release.commitCount} commit
                {release.commitCount === 1 ? "" : "s"} used
              </span>
            </div>
          )}
      </div>
    </article>
  );
}

function FeedbackStatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        FEEDBACK_STATUS_DOT_COLORS[
          status as keyof typeof FEEDBACK_STATUS_DOT_COLORS
        ] ?? "bg-gray-400"
      )}
      title={
        FEEDBACK_STATUS_LABELS[status as keyof typeof FEEDBACK_STATUS_LABELS] ??
        status
      }
    />
  );
}

function GitHubStatusIndicator({ release }: { release: ReleaseData }) {
  if (release.githubReleaseId && release.githubHtmlUrl) {
    return (
      <a
        className="flex items-center gap-1 text-green-600 text-xs dark:text-green-400"
        href={release.githubHtmlUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        <GithubLogo className="size-3.5" />
        <Check className="size-3" />
      </a>
    );
  }

  if (release.githubPushStatus === "pending") {
    return (
      <span className="flex items-center gap-1 text-muted-foreground text-xs">
        <GithubLogo className="size-3.5" />
        <Spinner className="size-3 animate-spin" />
      </span>
    );
  }

  if (release.githubPushStatus === "failed") {
    return (
      <span className="flex items-center gap-1 text-destructive text-xs">
        <GithubLogo className="size-3.5" />
        <WarningCircle className="size-3" />
      </span>
    );
  }

  return null;
}
