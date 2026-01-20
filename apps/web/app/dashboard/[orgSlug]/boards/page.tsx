"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { MessageSquare, Plus } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function BoardsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const boards = useQuery(
    api.boards.list,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const createBoard = useMutation(api.boards_actions.create);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [boardDescription, setBoardDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  if (!org) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="font-semibold text-xl">Organization not found</h2>
          <p className="mt-2 text-muted-foreground">
            The organization you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have access.
          </p>
        </div>
      </div>
    );
  }

  const handleCreateBoard = async () => {
    if (!(boardName.trim() && org?._id)) {
      return;
    }

    setIsCreating(true);
    try {
      await createBoard({
        organizationId: org._id as Id<"organizations">,
        name: boardName.trim(),
        description: boardDescription.trim() || undefined,
      });
      setBoardName("");
      setBoardDescription("");
      setIsDialogOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">Boards</h1>
          <p className="text-muted-foreground">
            Manage feedback boards for {org.name}
          </p>
        </div>
        <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Board
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a new board</DialogTitle>
              <DialogDescription>
                Create a new feedback board to collect user feedback.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="board-name">Board name</Label>
                <Input
                  id="board-name"
                  onChange={(e) => setBoardName(e.target.value)}
                  placeholder="Feature Requests"
                  value={boardName}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="board-description">Description</Label>
                <Textarea
                  id="board-description"
                  onChange={(e) => setBoardDescription(e.target.value)}
                  placeholder="Collect and prioritize feature requests from users"
                  value={boardDescription}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={!boardName.trim() || isCreating}
                onClick={handleCreateBoard}
              >
                {isCreating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {boards && boards.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <Link
              href={`/dashboard/${orgSlug}/boards/${board.slug}`}
              key={board._id}
            >
              <Card className="transition-colors hover:bg-accent">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">{board.name}</CardTitle>
                  </div>
                  <CardDescription>
                    {board.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Click to view feedback
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 font-semibold text-lg">No boards yet</h3>
            <p className="mb-4 text-muted-foreground">
              Create your first board to start collecting feedback.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Board
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
