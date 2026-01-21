"use client";

import { CaretDown, Plus } from "@phosphor-icons/react";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface SimilarPost {
  _id: Id<"feedback">;
  title: string;
  voteCount: number;
}

interface SimilarPostsProps {
  posts: SimilarPost[];
  onPostClick?: (postId: Id<"feedback">) => void;
}

export function SimilarPosts({ posts, onPostClick }: SimilarPostsProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (posts.length === 0) {
    return null;
  }

  return (
    <Collapsible onOpenChange={setIsOpen} open={isOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-muted/30 p-3 text-left hover:bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">Similar posts</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
            {posts.length}
          </span>
        </div>
        <CaretDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-2 rounded-lg border p-3">
          {posts.map((post) => (
            <SimilarPostItem
              key={post._id}
              onClick={() => onPostClick?.(post._id)}
              post={post}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface SimilarPostItemProps {
  post: SimilarPost;
  onClick?: () => void;
}

function SimilarPostItem({ post, onClick }: SimilarPostItemProps) {
  return (
    <button
      className="flex w-full items-center justify-between rounded p-2 text-left hover:bg-muted"
      onClick={onClick}
      type="button"
    >
      <span className="text-sm">{post.title}</span>
      <span className="text-muted-foreground text-xs">
        {post.voteCount} votes
      </span>
    </button>
  );
}

interface UpvotersListProps {
  voters: Array<{
    name?: string | null;
    email?: string;
    image?: string | null;
  }>;
  totalCount: number;
  maxVisible?: number;
}

export function UpvotersList({
  voters,
  totalCount,
  maxVisible = 5,
}: UpvotersListProps) {
  const [showAll, setShowAll] = useState(false);
  const visibleVoters = showAll ? voters : voters.slice(0, maxVisible);
  const remainingCount = totalCount - maxVisible;

  if (voters.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No upvotes yet. Be first!</p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {visibleVoters.map((voter) => (
          <Avatar
            className="h-8 w-8 border-2 border-background"
            key={voter.email}
          >
            <AvatarImage src={voter.image ?? undefined} />
            <AvatarFallback className="text-xs">
              {voter.name?.charAt(0) || voter.email?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
        ))}
        {!showAll && remainingCount > 0 && (
          <Button
            className="h-8 w-8 rounded-full p-0"
            onClick={() => setShowAll(true)}
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">Show {remainingCount} more</span>
          </Button>
        )}
      </div>
      {showAll && voters.length > maxVisible && (
        <Button
          className="h-auto p-0 text-xs"
          onClick={() => setShowAll(false)}
          variant="link"
        >
          Show less
        </Button>
      )}
    </div>
  );
}
