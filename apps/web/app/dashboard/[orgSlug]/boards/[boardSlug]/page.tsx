"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, MessageSquare, Plus, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";

import { Button } from "@/components/ui/button";
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
  const createFeedback = useMutation(api.feedback_actions.create);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

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
          <Button asChild className="mt-4">
            <Link href={`/dashboard/${orgSlug}/boards`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Boards
            </Link>
          </Button>
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
        description: feedbackDescription.trim() || undefined,
      });
      setFeedbackTitle("");
      setFeedbackDescription("");
      setIsDialogOpen(false);
    } finally {
      setIsCreating(false);
    }
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
        <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Feedback
            </Button>
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

      {feedbackList && feedbackList.length > 0 ? (
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
      ) : (
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
      )}
    </div>
  );
}
