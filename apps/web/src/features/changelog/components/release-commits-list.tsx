"use client";

import {
  CaretDown,
  CaretRight,
  FileCode,
  GitCommit,
  User,
} from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface CommitInfo {
  sha: string;
  message: string;
  fullMessage: string;
  author: string;
  date: string;
}

interface FileInfo {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
}

interface ReleaseCommitsListProps {
  commits: CommitInfo[];
  files?: FileInfo[];
  previousTag?: string;
  className?: string;
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
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-6 py-3 text-left text-sm transition-colors hover:bg-muted/50">
        {isOpen ? (
          <CaretDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <CaretRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <GitCommit className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="font-medium text-muted-foreground">
          {commits.length} commit{commits.length === 1 ? "" : "s"} used
        </span>
        {previousTag && (
          <Badge className="ml-1 text-xs" variant="outline">
            from {previousTag}
          </Badge>
        )}
        {files && files.length > 0 && (
          <span className="ml-auto flex items-center gap-1.5 text-muted-foreground text-xs">
            <FileCode className="h-3.5 w-3.5" />
            {files.length} file{files.length === 1 ? "" : "s"}
            {totalAdditions > 0 && (
              <span className="text-green-600 dark:text-green-400">
                +{totalAdditions}
              </span>
            )}
            {totalDeletions > 0 && (
              <span className="text-red-500 dark:text-red-400">
                −{totalDeletions}
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
                <span className="min-w-0 flex-1 truncate">
                  {commit.message}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-muted-foreground text-xs">
                  <User className="h-3 w-3" />
                  {commit.author}
                </span>
                <span
                  className="shrink-0 text-muted-foreground text-xs"
                  title={commit.date}
                >
                  {formatDistanceToNow(new Date(commit.date), {
                    addSuffix: true,
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
