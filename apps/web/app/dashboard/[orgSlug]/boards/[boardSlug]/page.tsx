"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { use } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BoardView } from "@/features/feedback/components/board-view";

export default function BoardDetailPage({
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
      <div className="p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-4 h-96 w-full" />
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
    <div className="p-6">
      <BoardView
        activeBoardFromList={{
          defaultView: board.defaultView,
          name: board.name,
          slug: board.slug,
        }}
        activeBoardId={board._id as Id<"boards">}
        basePath={`/dashboard/${orgSlug}`}
        isAdmin={isAdmin}
        isMember={isMember}
        primaryColor={primaryColor}
      />
    </div>
  );
}
