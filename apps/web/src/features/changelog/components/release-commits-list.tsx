"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Badge } from "@ctrl-ui/react/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ctrl-ui/react/ui/collapsible";
import {
  CaretRight,
  FileCode,
  GitCommit,
  GitPullRequest,
  User,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type {
  ReleaseCommit,
  ReleaseFile,
  ReleasePullRequest,
} from "@reflet/backend/convex/changelog/tableFields";
import { useQuery } from "convex/react";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";

const SHORT_SHA_LENGTH = 7;

export function describeCommitCount(used: number, total: number): string {
  const noun = total === 1 ? "commit" : "commits";
  return total > used ? `${used} of ${total} ${noun}` : `${used} ${noun}`;
}

export function ReleaseCommitsList({
  className,
  releaseId,
}: {
  className?: string;
  releaseId: Id<"releases">;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const snapshot = useQuery(api.changelog.release_commits.getReleaseCommits, {
    releaseId,
  });

  if (!snapshot || snapshot.commits.length === 0) {
    return null;
  }

  const { baseRef, commits, headRef, headSha, maintainerNotes } = snapshot;
  const files = snapshot.files ?? [];
  const pullRequests = snapshot.pullRequests ?? [];
  const totalCommits = snapshot.totalCommits ?? commits.length;

  return (
    <Collapsible
      className={cn("border-t", className)}
      onOpenChange={setIsOpen}
      open={isOpen}
    >
      <CollapsibleTrigger className="flex w-full flex-wrap items-center gap-2 px-6 py-3 text-left text-sm hover:bg-muted/50">
        <CaretRight
          aria-hidden="true"
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground",
            isOpen && "rotate-90"
          )}
        />
        <GitCommit
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
        <span className="font-medium text-muted-foreground tabular-nums">
          {describeCommitCount(commits.length, totalCommits)} used
        </span>
        {headRef && (
          <Badge className="ml-1 font-mono" size="sm" variant="outline">
            {baseRef ? `${baseRef} → ${headRef}` : `up to ${headRef}`}
            {headSha && ` @ ${headSha.slice(0, SHORT_SHA_LENGTH)}`}
          </Badge>
        )}
        {files.length > 0 && <FileStats files={files} />}
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="max-h-80 space-y-4 overflow-y-auto border-t bg-muted/20 px-6 py-3">
          {maintainerNotes && (
            <section aria-label="Maintainer notes" className="space-y-1">
              <h4 className="font-medium text-muted-foreground text-xs">
                GitHub release notes
              </h4>
              <p className="whitespace-pre-wrap text-pretty text-sm">
                {maintainerNotes}
              </p>
            </section>
          )}
          {pullRequests.length > 0 && (
            <PullRequestList pullRequests={pullRequests} />
          )}
          <CommitList commits={commits} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function FileStats({ files }: { files: ReleaseFile[] }) {
  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

  return (
    <span className="ml-auto flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums">
      <FileCode aria-hidden="true" className="size-3.5" />
      {files.length} file{files.length === 1 ? "" : "s"}
      {totalAdditions > 0 && (
        <span className="text-success-text">
          +{totalAdditions}
          <span className="sr-only"> lines added</span>
        </span>
      )}
      {totalDeletions > 0 && (
        <span className="text-destructive-text">
          −{totalDeletions}
          <span className="sr-only"> lines removed</span>
        </span>
      )}
    </span>
  );
}

function PullRequestList({
  pullRequests,
}: {
  pullRequests: ReleasePullRequest[];
}) {
  return (
    <ul aria-label="Pull requests" className="space-y-1">
      {pullRequests.map((pullRequest) => (
        <li
          className="flex items-start gap-2 py-1 text-sm"
          key={pullRequest.number}
        >
          <GitPullRequest
            aria-hidden="true"
            className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
          />
          <a
            className="min-w-0 flex-1 truncate underline-offset-4 hover:underline"
            href={pullRequest.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="text-muted-foreground tabular-nums">
              #{pullRequest.number}
            </span>{" "}
            {pullRequest.title}
          </a>
        </li>
      ))}
    </ul>
  );
}

function CommitList({ commits }: { commits: ReleaseCommit[] }) {
  return (
    <ul aria-label="Commits" className="space-y-1">
      {commits.map((commit) => (
        <li className="flex items-start gap-2 py-1 text-sm" key={commit.sha}>
          <code className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs">
            {commit.sha.slice(0, SHORT_SHA_LENGTH)}
          </code>
          <span className="min-w-0 flex-1 truncate" title={commit.fullMessage}>
            {commit.message}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-muted-foreground text-xs">
            <User aria-hidden="true" className="size-3" />
            {commit.author}
          </span>
          <time
            className="shrink-0 text-muted-foreground text-xs tabular-nums"
            dateTime={commit.date}
            title={format(new Date(commit.date), "PPpp")}
          >
            {formatDistanceToNow(new Date(commit.date), { addSuffix: true })}
          </time>
        </li>
      ))}
    </ul>
  );
}
