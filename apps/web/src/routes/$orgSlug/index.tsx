import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ChevronUp, Globe, MessageSquare } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/$orgSlug/")({
  component: PublicOrgPage,
});

function PublicOrgPage() {
  const { orgSlug } = Route.useParams();
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const publicBoards = useQuery(
    api.boards.list,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [newFeedback, setNewFeedback] = useState({
    title: "",
    description: "",
    email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createFeedback = useMutation(api.feedback_actions.createPublic);
  const toggleVote = useMutation(api.votes.toggle);

  // Get feedback for selected board or first board
  const activeBoardId = selectedBoardId || publicBoards?.[0]?._id || null;
  const feedback = useQuery(
    api.feedback_actions.listPublic,
    activeBoardId ? { boardId: activeBoardId as Id<"boards"> } : "skip"
  );

  const handleSubmitFeedback = async () => {
    if (!(newFeedback.title.trim() && activeBoardId)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createFeedback({
        boardId: activeBoardId as Id<"boards">,
        title: newFeedback.title.trim(),
        description: newFeedback.description.trim() || undefined,
        email: newFeedback.email.trim() || undefined,
      });
      setShowSubmitDialog(false);
      setNewFeedback({ title: "", description: "", email: "" });
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVote = async (feedbackId: string) => {
    try {
      await toggleVote({ feedbackId: feedbackId as Id<"feedback"> });
    } catch (error) {
      console.error("Failed to vote:", error);
    }
  };

  if (!org) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  const primaryColor = org.primaryColor ?? "#3b82f6";

  // Sort feedback: pinned first, then by votes
  const sortedFeedback = [...(feedback || [])].sort((a, b) => {
    if (a.isPinned && !b.isPinned) {
      return -1;
    }
    if (!a.isPinned && b.isPinned) {
      return 1;
    }
    return b.voteCount - a.voteCount;
  });

  let feedbackContent: ReactNode = (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Globe className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="font-semibold text-lg">No public boards</h3>
        <p className="text-muted-foreground">
          This organization hasn't made any boards public yet.
        </p>
      </CardContent>
    </Card>
  );

  if (sortedFeedback.length > 0) {
    feedbackContent = (
      <div className="space-y-4">
        {sortedFeedback.map((item) => (
          <Card key={item._id}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-4">
                {/* Vote button */}
                <button
                  className="flex flex-col items-center rounded-lg border p-2 transition-colors"
                  onClick={() => handleToggleVote(item._id)}
                  style={{
                    borderColor: item.hasVoted ? primaryColor : undefined,
                    backgroundColor: item.hasVoted
                      ? `${primaryColor}15`
                      : undefined,
                    color: item.hasVoted ? primaryColor : undefined,
                  }}
                  type="button"
                >
                  <ChevronUp className="h-4 w-4" />
                  <span className="font-semibold text-sm">
                    {item.voteCount}
                  </span>
                </button>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <span className="font-semibold">{item.title}</span>
                  </div>
                  {item.tags && item.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.tags
                        .filter(
                          (tag): tag is NonNullable<typeof tag> => tag !== null
                        )
                        .map((tag) => (
                          <Badge
                            className="text-white"
                            key={tag._id}
                            style={{ backgroundColor: tag.color }}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                    </div>
                  )}
                  {item.description && (
                    <p className="mt-2 line-clamp-2 text-muted-foreground text-sm">
                      {item.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-muted-foreground text-sm">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      {item.commentCount} comments
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  } else if (publicBoards && publicBoards.length > 0) {
    feedbackContent = (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <h3 className="font-semibold text-lg">No feedback yet</h3>
          <p className="mb-4 text-muted-foreground">
            Be the first to share your ideas!
          </p>
          <Button
            onClick={() => setShowSubmitDialog(true)}
            style={{ backgroundColor: primaryColor }}
          >
            Submit Feedback
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="font-bold text-3xl">Feature Requests & Feedback</h1>
        <p className="mt-2 text-muted-foreground">
          Help us improve by sharing your ideas and voting on features you'd
          like to see.
        </p>
      </div>

      {/* Board selector and submit button */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {publicBoards && publicBoards.length > 1 && (
            <Select
              onValueChange={setSelectedBoardId}
              value={activeBoardId || undefined}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {publicBoards.map((board) => (
                  <SelectItem key={board._id} value={board._id}>
                    {board.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {publicBoards && publicBoards.length === 1 && (
            <h2 className="font-semibold text-lg">{publicBoards[0].name}</h2>
          )}
        </div>
        <Button
          onClick={() => setShowSubmitDialog(true)}
          style={{ backgroundColor: primaryColor }}
        >
          Submit Feedback
        </Button>
      </div>

      {/* Feedback list */}
      {feedbackContent}

      {/* Submit feedback dialog */}
      <Dialog onOpenChange={setShowSubmitDialog} open={showSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit feedback</DialogTitle>
            <DialogDescription>
              Share your ideas, report bugs, or request features.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                onChange={(e) =>
                  setNewFeedback({ ...newFeedback, title: e.target.value })
                }
                placeholder="Short summary of your feedback"
                value={newFeedback.title}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                onChange={(e) =>
                  setNewFeedback({
                    ...newFeedback,
                    description: e.target.value,
                  })
                }
                placeholder="Provide more details..."
                rows={4}
                value={newFeedback.description}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                onChange={(e) =>
                  setNewFeedback({ ...newFeedback, email: e.target.value })
                }
                placeholder="your@email.com"
                type="email"
                value={newFeedback.email}
              />
              <p className="text-muted-foreground text-xs">
                We'll notify you when there are updates to your feedback.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowSubmitDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isSubmitting || !newFeedback.title.trim()}
              onClick={handleSubmitFeedback}
              style={{ backgroundColor: primaryColor }}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
