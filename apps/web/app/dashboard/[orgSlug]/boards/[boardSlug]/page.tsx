"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  MessageSquare,
  Plus,
  Settings,
  ThumbsUp,
} from "lucide-react";
import Link from "next/link";
import { use, useCallback, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  type BoardView,
  BoardViewToggle,
} from "@/features/feedback/components/board-view-toggle";
import { RoadmapKanban } from "@/features/feedback/components/roadmap-kanban";

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
  const feedbackList = useQuery(
    api.feedback_list.list,
    board?._id ? { boardId: board._id as Id<"boards"> } : "skip"
  );
  const createFeedback = useMutation(api.feedback.create);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [view, setView] = useState<BoardView>(
    (board?.defaultView as BoardView) ?? "feed"
  );

  // Update view when board loads with a default view
  const handleViewChange = useCallback((newView: BoardView) => {
    setView(newView);
  }, []);

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
          Loading board...
        </div>
      </div>
    );
  }

  const handleCreateFeedback = async () => {
    if (!(feedbackTitle.trim() && board?._id)) {
      return;
    }

    setIsCreating(true);
    try {
      await createFeedback({
        boardId: board._id as Id<"boards">,
        title: feedbackTitle.trim(),
        description: feedbackDescription.trim(),
      });
      setFeedbackTitle("");
      setFeedbackDescription("");
      setIsDialogOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  const renderFeedContent = (): React.ReactNode => {
    if (feedbackList && feedbackList.length > 0) {
      return (
        <div className="space-y-4">
          {feedbackList.map((feedback) => (
            <Card key={feedback._id}>
              <CardHeader>
                <CardTitle className="text-lg">{feedback.title}</CardTitle>
                {feedback.description ? (
                  <CardDescription>{feedback.description}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-muted-foreground text-sm">
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-4 w-4" />
                    {feedback.voteCount ?? 0} votes
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    {feedback.commentCount ?? 0} comments
                  </span>
                </div>
              </CardContent>
              <CardFooter>
                <span className="rounded-full bg-muted px-2 py-1 text-xs">
                  {feedback.status}
                </span>
              </CardFooter>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 font-semibold text-lg">No feedback yet</h3>
          <p className="mb-4 text-muted-foreground">
            Be the first to submit feedback to this board.
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Feedback
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          className="mb-4 inline-flex items-center text-muted-foreground text-sm hover:text-foreground"
          href={`/dashboard/${orgSlug}/boards`}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Boards
        </Link>
      </div>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">{board.name}</h1>
          {board.description ? (
            <p className="text-muted-foreground">{board.description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <BoardViewToggle onChange={handleViewChange} view={view} />
          <Link
            className={buttonVariants({ size: "icon", variant: "outline" })}
            href={`/dashboard/${orgSlug}/boards/${boardSlug}/settings`}
          >
            <Settings className="h-4 w-4" />
          </Link>
          <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" />
              Add Feedback
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit feedback</DialogTitle>
                <DialogDescription>
                  Share your idea, feature request, or bug report.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="feedback-title">Title</Label>
                  <Input
                    id="feedback-title"
                    onChange={(e) => setFeedbackTitle(e.target.value)}
                    placeholder="Short summary of your feedback"
                    value={feedbackTitle}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="feedback-description">Description</Label>
                  <Textarea
                    id="feedback-description"
                    onChange={(e) => setFeedbackDescription(e.target.value)}
                    placeholder="Describe your feedback in detail..."
                    rows={4}
                    value={feedbackDescription}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={!feedbackTitle.trim() || isCreating}
                  onClick={handleCreateFeedback}
                >
                  {isCreating ? "Submitting..." : "Submit Feedback"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {view === "roadmap" ? (
        <RoadmapKanban
          boardId={board._id as Id<"boards">}
          isMember={board.isMember ?? false}
        />
      ) : (
        renderFeedContent()
      )}
    </div>
  );
}
