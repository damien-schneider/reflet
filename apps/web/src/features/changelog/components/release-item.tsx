"use client";

import {
  Calendar,
  Check,
  DotsThreeVertical,
  Eye,
  EyeSlash,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { format } from "date-fns";
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
import { MarkdownRenderer } from "@/components/ui/tiptap/markdown-renderer";
import { cn } from "@/lib/utils";

interface LinkedFeedback {
  _id: Id<"feedback">;
  title: string;
}

export interface ReleaseData {
  _id: Id<"releases">;
  version?: string;
  title: string;
  description?: string;
  publishedAt?: number;
  _creationTime: number;
  feedback?: (LinkedFeedback | null)[];
}

interface ReleaseItemProps {
  release: ReleaseData;
  orgSlug: string;
  isAdmin?: boolean;
  onPublish?: () => void;
  onUnpublish?: () => void;
  onDelete?: () => void;
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
  const publishDate = release.publishedAt
    ? format(release.publishedAt, "MMMM d, yyyy")
    : null;

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
            {!isPublished && (
              <Badge variant="secondary">
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
          </div>

          {/* Admin actions */}
          {isAdmin && (
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href={`/dashboard/${orgSlug}/changelog/${release._id}/edit`}
              >
                <Button size="sm" variant="ghost">
                  <PencilSimple className="h-4 w-4" />
                  <span className="ml-1.5 hidden sm:inline">Edit</span>
                </Button>
              </Link>
              <DropdownList>
                <DropdownListTrigger
                  render={(props: React.ComponentProps<"button">) => (
                    <Button {...props} size="icon" variant="ghost">
                      <DotsThreeVertical className="h-4 w-4" />
                    </Button>
                  )}
                />
                <DropdownListContent align="end">
                  {isPublished ? (
                    <DropdownListItem onClick={onUnpublish}>
                      <EyeSlash className="mr-2 h-4 w-4" />
                      Unpublish
                    </DropdownListItem>
                  ) : (
                    <DropdownListItem onClick={onPublish}>
                      <Eye className="mr-2 h-4 w-4" />
                      Publish
                    </DropdownListItem>
                  )}
                  <DropdownListSeparator />
                  <DropdownListItem
                    className="text-destructive"
                    onClick={onDelete}
                  >
                    <Trash className="mr-2 h-4 w-4" />
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
          <MarkdownRenderer content={release.description} />
        )}

        {/* Shipped features */}
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
                    <Check className="h-4 w-4 shrink-0 text-olive-500" />
                    <span>{item.title}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}
