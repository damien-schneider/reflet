"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
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
import { FeedbackStatusBadge } from "./feedback-status-badge";

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
  const showCommitCount = isAdmin && (release.commitCount ?? 0) > 0;

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
          <ReleaseMeta release={release} />
          {isAdmin && (
            <ReleaseAdminActions
              isPublished={isPublished}
              onDelete={onDelete}
              onPublish={onPublish}
              onUnpublish={onUnpublish}
              orgSlug={orgSlug}
              release={release}
            />
          )}
        </div>
      </div>

      <div className={cn("pt-6 pb-12", !isPublished && "opacity-70")}>
        <h2 className="mb-4 text-balance font-semibold text-2xl md:text-3xl">
          {release.title}
        </h2>

        {release.description && (
          <MarkdownRenderer
            className="max-w-prose"
            content={release.description}
          />
        )}

        <ShippedFeatures feedback={release.feedback} />

        {showCommitCount && (
          <CommitCountNote commitCount={release.commitCount ?? 0} />
        )}
      </div>
    </article>
  );
}

function ReleaseMeta({ release }: { release: ReleaseData }) {
  const { publishedAt, scheduledPublishAt } = release;
  const isPublished = publishedAt !== undefined;
  const scheduledAt = isPublished ? undefined : scheduledPublishAt;

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {release.version && (
        <Badge className="tabular-nums" size="md" variant="outline">
          {release.version}
        </Badge>
      )}
      {scheduledAt === undefined ? null : (
        <Badge color="yellow" size="sm">
          <Clock aria-hidden="true" className="size-3" />
          Scheduled{" "}
          <span className="tabular-nums">
            {format(scheduledAt, "MMM d, h:mm a")}
          </span>
        </Badge>
      )}
      {!isPublished && scheduledAt === undefined && (
        <Badge size="sm">
          <EyeSlash aria-hidden="true" className="size-3" />
          Draft
        </Badge>
      )}
      {publishedAt ? (
        <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
          <Calendar aria-hidden="true" className="size-4" />
          <time dateTime={new Date(publishedAt).toISOString()}>
            {format(publishedAt, "MMMM d, yyyy")}
          </time>
        </span>
      ) : null}

      {isPublished && <GitHubStatusIndicator release={release} />}
    </div>
  );
}

interface ReleaseAdminActionsProps {
  isPublished: boolean;
  onDelete?: () => void;
  onPublish?: () => void;
  onUnpublish?: () => void;
  orgSlug: string;
  release: ReleaseData;
}

function ReleaseAdminActions({
  isPublished,
  onDelete,
  onPublish,
  onUnpublish,
  orgSlug,
  release,
}: ReleaseAdminActionsProps) {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <ButtonLink
        render={
          <Link href={`/dashboard/${orgSlug}/changelog/${release._id}/edit`} />
        }
        size="xs"
        variant="ghost"
      >
        <PencilSimple aria-hidden="true" className="size-4" />
        <span className="sr-only sm:not-sr-only">Edit</span>
      </ButtonLink>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={(props: React.ComponentProps<"button">) => (
            <Button
              {...props}
              aria-label={`Actions for ${release.title}`}
              iconOnly
              size="xs"
              variant="ghost"
            >
              <DotsThreeVertical aria-hidden="true" className="size-4" />
            </Button>
          )}
        />
        <DropdownMenuContent align="end">
          {isPublished ? (
            <DropdownMenuItem onClick={onUnpublish}>
              <EyeSlash aria-hidden="true" className="size-4" />
              Unpublish
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={onPublish}>
              <Eye aria-hidden="true" className="size-4" />
              Publish
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="menu-item-danger" onClick={onDelete}>
            <Trash aria-hidden="true" className="size-4" />
            Delete…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ShippedFeatures({ feedback }: { feedback: ReleaseData["feedback"] }) {
  const items = (feedback ?? []).filter(
    (item): item is LinkedFeedback => item !== null
  );
  if (!feedback || feedback.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 max-w-prose">
      <h3 className="mb-3 font-medium text-muted-foreground text-sm">
        Shipped features
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li className="flex items-center gap-2 text-sm" key={item._id}>
            <Check
              aria-hidden="true"
              className="size-4 shrink-0 text-success-text"
            />
            <span className="min-w-0 flex-1 text-pretty">{item.title}</span>
            {item.status && <FeedbackStatusBadge status={item.status} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CommitCountNote({ commitCount }: { commitCount: number }) {
  return (
    <div className="mt-4 flex items-center gap-1.5 text-muted-foreground text-xs">
      <GitCommit aria-hidden="true" className="size-3.5" />
      <span>
        <span className="tabular-nums">{commitCount}</span> commit
        {commitCount === 1 ? "" : "s"} used
      </span>
    </div>
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
        title="View release on GitHub"
      >
        <GithubLogo aria-hidden="true" className="size-3.5" />
        <Check aria-hidden="true" className="size-3" />
      </a>
    );
  }

  if (release.githubPushStatus === "pending") {
    return (
      <span
        className="flex items-center gap-1 text-muted-foreground text-xs"
        title="Pushing to GitHub"
      >
        <GithubLogo aria-hidden="true" className="size-3.5" />
        <Spinner data-icon="inline-start" size="xs" />
        <span className="sr-only">Pushing to GitHub</span>
      </span>
    );
  }

  if (release.githubPushStatus === "failed") {
    return (
      <span
        className="flex items-center gap-1 text-destructive-text text-xs"
        title="Push to GitHub failed"
      >
        <GithubLogo aria-hidden="true" className="size-3.5" />
        <WarningCircle aria-hidden="true" className="size-3" />
        <span className="sr-only">Push to GitHub failed</span>
      </span>
    );
  }

  return null;
}
