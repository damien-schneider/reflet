"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { use, useCallback } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusManager } from "@/features/feedback/components/status-manager";

export default function BoardGearPage({
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
  const updateBoard = useMutation(api.boards.update);
  const createDefaultStatuses = useMutation(api.board_statuses.createDefaults);
  const statuses = useQuery(
    api.board_statuses.list,
    board?._id ? { boardId: board._id as Id<"boards"> } : "skip"
  );

  const handleDefaultViewChange = useCallback(
    async (view: string | null) => {
      if (!(board?._id && view)) {
        return;
      }
      await updateBoard({
        id: board._id as Id<"boards">,
        defaultView: view as "roadmap" | "feed",
      });
    },
    [board?._id, updateBoard]
  );

  const handleInitializeStatuses = useCallback(async () => {
    if (!board?._id) {
      return;
    }
    await createDefaultStatuses({ boardId: board._id as Id<"boards"> });
  }, [board?._id, createDefaultStatuses]);

  if (!org) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="font-semibold text-xl">Organization not found</h2>
          <p className="mt-2 text-muted-foreground">
            The organization you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  if (board === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="font-semibold text-xl">Board not found</h2>
          <p className="mt-2 text-muted-foreground">
            The board &quot;{boardSlug}&quot; doesn&apos;t exist.
          </p>
          <Link
            className={buttonVariants({ className: "mt-4" })}
            href={`/dashboard/${orgSlug}/boards`}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Boards
          </Link>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          Loading board settings...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          className="mb-4 inline-flex items-center text-muted-foreground text-sm hover:text-foreground"
          href={`/${orgSlug}/boards/${boardSlug}`}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Board
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="font-bold text-2xl">Board Gear</h1>
        <p className="text-muted-foreground">
          Configure settings for {board.name}
        </p>
      </div>

      <div className="space-y-6">
        {/* Default View */}
        <Card>
          <CardHeader>
            <CardTitle>Default View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Label htmlFor="default-view">
                Choose the default view when opening this board
              </Label>
              <Select
                onValueChange={handleDefaultViewChange}
                value={board.defaultView ?? "feed"}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feed">Feed (List)</SelectItem>
                  <SelectItem value="roadmap">Roadmap (Kanban)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Status Management */}
        <Card>
          <CardHeader>
            <CardTitle>Roadmap Statuses</CardTitle>
          </CardHeader>
          <CardContent>
            {statuses && statuses.length > 0 ? (
              <StatusManager boardId={board._id as Id<"boards">} />
            ) : (
              <div className="text-center">
                <p className="mb-4 text-muted-foreground">
                  No statuses configured for this board. Initialize default
                  statuses to enable the roadmap view.
                </p>
                <Button onClick={handleInitializeStatuses}>
                  Initialize Default Statuses
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
