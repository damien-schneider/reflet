"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { use } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BoardView } from "@/features/feedback/components/board-view";

export default function BoardPage({
  params,
}: {
  params: Promise<{ orgSlug: string; boardSlug: string }>;
}) {
  const { orgSlug, boardSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const board = useQuery(
    api.boards.getBySlug,
    org?._id
      ? { organizationId: org._id as Id<"organizations">, slug: boardSlug }
      : "skip"
  );

  if (org === undefined || board === undefined) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <Skeleton className="mx-auto h-10 w-64" />
          <Skeleton className="mx-auto mt-2 h-5 w-96" />
        </div>
      </div>
    );
  }

  if (!(org && board)) {
    return null;
  }

  const primaryColor = org.primaryColor ?? "#3b82f6";
  const isMember = board.isMember ?? false;
  const isAdmin = board.role === "admin" || board.role === "owner";

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="font-bold text-3xl">Feature Requests & Feedback</h1>
        <p className="mt-2 text-muted-foreground">
          Help us improve by sharing your ideas and voting on features
          you&apos;d like to see.
        </p>
      </div>

      <BoardView
        activeBoardFromList={{
          defaultView: board.defaultView,
          name: board.name,
          slug: board.slug,
        }}
        activeBoardId={board._id as Id<"boards">}
        basePath={`/${orgSlug}`}
        isAdmin={isAdmin}
        isMember={isMember}
        primaryColor={primaryColor}
      />
    </div>
  );
}
