"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Badge } from "@ctrl-ui/react/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ctrl-ui/react/ui/collapsible";
import { CaretRight, FileCode, GitCommit, User } from "@phosphor-icons/react";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface CommitInfo {
  author: string;
  date: string;
  fullMessage: string;
  message: string;
  sha: string;
}

interface FileInfo {
  additions: number;
  deletions: number;
  filename: string;
  status: string;
}

interface ReleaseCommitsListProps {
  className?: string;
  commits: CommitInfo[];
  files?: FileInfo[];
  previousTag?: string;
}

export function ReleaseCommitsList({
  commits,
  files,
  previousTag,
  className,
}: ReleaseCommitsListProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (commits.length === 0) {
    return null;
  }

  const totalAdditions = files?.reduce((sum, f) => sum + f.additions, 0) ?? 0;
  const totalDeletions = files?.reduce((sum, f) => sum + f.deletions, 0) ?? 0;

  return (
    <Collapsible
      className={cn("border-t", className)}
      onOpenChange={setIsOpen}
      open={isOpen}
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-6 py-3 text-left text-sm hover:bg-muted/50">
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
          {commits.length} commit{commits.length === 1 ? "" : "s"} used
        </span>
        {previousTag && (
          <Badge className="ml-1 tabular-nums" size="sm" variant="outline">
            from {previousTag}
          </Badge>
        )}
        {files && files.length > 0 && (
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
        )}
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="max-h-64 overflow-y-auto border-t bg-muted/20 px-6 py-2">
          <ul className="space-y-1">
            {commits.map((commit) => (
              <li
                className="flex items-start gap-2 py-1 text-sm"
                key={commit.sha}
              >
                <code className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs">
                  {commit.sha}
                </code>
                <span
                  className="min-w-0 flex-1 truncate"
                  title={commit.fullMessage}
                >
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
                  {formatDistanceToNow(new Date(commit.date), {
                    addSuffix: true,
                  })}
                </time>
              </li>
            ))}
          </ul>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
