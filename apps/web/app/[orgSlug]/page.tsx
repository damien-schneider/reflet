"use client";

import { Globe } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BoardView as BoardViewComponent } from "@/features/feedback/components/board-view";

export default function PublicOrgPage({
  params,
}: {
  params: Promise<{ orgSlug: string; boardSlug?: string }>;
}) {
  const { orgSlug, boardSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const publicBoards = useQuery(
    api.boards.list,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  // Get board details when boardSlug is provided or when a board is selected
  const selectedBoardFromSlug = publicBoards?.find((b) => b.slug === boardSlug);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(
    selectedBoardFromSlug?._id || null
  );

  // Get detailed board info with isMember/role when we have a board
  const activeBoardId =
    selectedBoardId ||
    selectedBoardFromSlug?._id ||
    publicBoards?.[0]?._id ||
    null;
  const activeBoardFromList = publicBoards?.find(
    (b) => b._id === activeBoardId
  );

  // Get board details with membership info
  const boardDetails = useQuery(
    api.boards.getBySlug,
    org?._id && activeBoardFromList?.slug
      ? {
          organizationId: org._id as Id<"organizations">,
          slug: activeBoardFromList.slug,
        }
      : "skip"
  );

  const isMember = boardDetails?.isMember ?? false;
  const role = boardDetails?.role ?? null;
  const isAdmin = role === "admin" || role === "owner";

  // Update selected board when boardSlug changes
  useEffect(() => {
    if (boardSlug && selectedBoardFromSlug) {
      setSelectedBoardId(selectedBoardFromSlug._id);
    }
  }, [boardSlug, selectedBoardFromSlug]);

  // Loading state
  if (org === undefined) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <Skeleton className="mx-auto h-10 w-64" />
          <Skeleton className="mx-auto mt-2 h-5 w-96" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton className="h-32 w-full" key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!org) {
    return null; // Layout handles 404
  }

  const primaryColor = org.primaryColor ?? "#3b82f6";

  // If we have a specific board selected, show the board view
  if (activeBoardId && activeBoardFromList) {
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

        {/* Board selector for multiple boards */}
        {publicBoards && publicBoards.length > 1 && (
          <div className="mb-6">
            <Select
              onValueChange={setSelectedBoardId}
              value={activeBoardId || undefined}
            >
              <SelectTrigger className="w-45">
                <SelectValue placeholder="Select board" />
              </SelectTrigger>
              <SelectContent>
                {publicBoards.map((board) => (
                  <SelectItem key={board._id} value={board._id}>
                    {board.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <BoardViewComponent
          activeBoardFromList={activeBoardFromList}
          activeBoardId={activeBoardId as Id<"boards">}
          basePath={`/${orgSlug}`}
          isAdmin={isAdmin}
          isMember={isMember}
          primaryColor={primaryColor}
        />
      </div>
    );
  }

  // Show board selector if no board is selected
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="font-bold text-3xl">Feature Requests & Feedback</h1>
        <p className="mt-2 text-muted-foreground">
          Help us improve by sharing your ideas and voting on features
          you&apos;d like to see.
        </p>
      </div>

      {publicBoards && publicBoards.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {publicBoards.map((board) => (
            <Link href={`/${orgSlug}/boards/${board.slug}`} key={board._id}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader>
                  <CardTitle className="text-lg">{board.name}</CardTitle>
                  <CardDescription>
                    {board.description || "No description"}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="font-semibold text-lg">No public boards</h3>
            <p className="text-muted-foreground">
              This organization hasn&apos;t made any boards public yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
