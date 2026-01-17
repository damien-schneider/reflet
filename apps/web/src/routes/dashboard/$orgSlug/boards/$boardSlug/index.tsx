import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  Globe,
  List,
  Lock,
  Map as MapIcon,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FeedbackCard } from "@/features/feedback/components/feedback-card";
import {
  CreateFeedbackDialog,
  DeleteBoardDialog,
  DeleteFeedbackDialog,
} from "@/features/feedback/components/feedback-dialogs";
import { RoadmapCard } from "@/features/feedback/components/roadmap-card";

export const Route = createFileRoute("/dashboard/$orgSlug/boards/$boardSlug/")({
  component: BoardDetailPage,
});

function BoardDetailPage() {
  const { orgSlug, boardSlug } = Route.useParams();
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const board = useQuery(
    api.boards.getBySlug,
    org?._id
      ? {
          organizationId: org._id as Id<"organizations">,
          slug: boardSlug,
        }
      : "skip"
  );
  const feedbackList = useQuery(
    api.feedback_list.list,
    board?._id ? { boardId: board._id as Id<"boards"> } : "skip"
  );
  const roadmapConfig = useQuery(
    api.tag_manager.getRoadmapConfig,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  const toggleVote = useMutation(api.votes.toggle);
  const togglePin = useMutation(api.feedback_actions.togglePin);
  const togglePublic = useMutation(api.boards_actions.togglePublic);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteBoardDialog, setShowDeleteBoardDialog] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "roadmap">("list");

  const handleToggleVote = async (feedbackId: string) => {
    try {
      await toggleVote({ feedbackId: feedbackId as Id<"feedback"> });
    } catch (error) {
      console.error("Failed to toggle vote:", error);
    }
  };

  const handleTogglePin = async (feedbackId: string) => {
    try {
      await togglePin({ id: feedbackId as Id<"feedback"> });
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  };

  const handleTogglePublic = async () => {
    if (!board?._id) {
      return;
    }
    try {
      await togglePublic({ id: board._id as Id<"boards"> });
    } catch (error) {
      console.error("Failed to toggle public:", error);
    }
  };

  if (!(org && board)) {
    return (
      <div className="flex h-full items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  const isAdmin = org.role === "owner" || org.role === "admin";
  const roadmapLanes = roadmapConfig?.lanes || [];

  const sortedFeedback = [...(feedbackList || [])].sort((a, b) => {
    if (a.isPinned && !b.isPinned) {
      return -1;
    }
    if (!a.isPinned && b.isPinned) {
      return 1;
    }
    return b.voteCount - a.voteCount;
  });

  const feedbackByLane = roadmapLanes.reduce(
    (acc, lane) => {
      acc[lane._id] = sortedFeedback.filter((f) => f.roadmapLane === lane._id);
      return acc;
    },
    {} as Record<string, typeof sortedFeedback>
  );

  const unassignedFeedback = sortedFeedback.filter((f) => !f.roadmapLane);

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-2xl">{board.name}</h1>
            {board.isPublic ? (
              <Badge variant="secondary">
                <Globe className="mr-1 h-3 w-3" />
                Public
              </Badge>
            ) : (
              <Badge variant="outline">
                <Lock className="mr-1 h-3 w-3" />
                Private
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">{board.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            onValueChange={(values) => {
              const value = values[0];
              if (value === "list" || value === "roadmap") {
                setViewMode(value);
              }
            }}
            value={[viewMode]}
          >
            <ToggleGroupItem aria-label="List view" value="list">
              <List className="mr-1 h-4 w-4" />
              List
            </ToggleGroupItem>
            <ToggleGroupItem aria-label="Roadmap view" value="roadmap">
              <MapIcon className="mr-1 h-4 w-4" />
              Roadmap
            </ToggleGroupItem>
          </ToggleGroup>

          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Feedback
          </Button>

          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={(props) => (
                  <Button {...props} size="icon" variant="outline">
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleTogglePublic}>
                  {board.isPublic ? (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Make Private
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" />
                      Make Public
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setShowDeleteBoardDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Board
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="mt-6">
          {sortedFeedback.length > 0 ? (
            <div className="space-y-4">
              {sortedFeedback.map((feedback) => (
                <FeedbackCard
                  boardSlug={boardSlug}
                  feedback={feedback}
                  isAdmin={isAdmin}
                  key={feedback._id}
                  onDelete={() => setFeedbackToDelete(feedback._id)}
                  onTogglePin={handleTogglePin}
                  onToggleVote={handleToggleVote}
                  orgSlug={orgSlug}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <h3 className="font-semibold text-lg">No feedback yet</h3>
                <p className="mb-4 text-muted-foreground">
                  Be the first to share your ideas!
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Feedback
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="mt-6">
          {roadmapLanes.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {roadmapLanes.map((lane) => (
                <div
                  className="w-80 shrink-0 rounded-lg border bg-muted/50 p-4"
                  key={lane._id}
                >
                  <div className="mb-4 flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded"
                      style={{ backgroundColor: lane.color }}
                    />
                    <h3 className="font-semibold">{lane.name}</h3>
                    <Badge className="ml-auto" variant="secondary">
                      {feedbackByLane[lane._id]?.length || 0}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {feedbackByLane[lane._id]?.map((feedback) => (
                      <RoadmapCard
                        boardSlug={boardSlug}
                        feedback={feedback}
                        key={feedback._id}
                        orgSlug={orgSlug}
                      />
                    ))}
                    {(!feedbackByLane[lane._id] ||
                      feedbackByLane[lane._id].length === 0) && (
                      <p className="py-4 text-center text-muted-foreground text-sm">
                        No items
                      </p>
                    )}
                  </div>
                </div>
              ))}

              <div className="w-80 shrink-0 rounded-lg border bg-muted/50 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-gray-400" />
                  <h3 className="font-semibold">Unassigned</h3>
                  <Badge className="ml-auto" variant="secondary">
                    {unassignedFeedback.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {unassignedFeedback.map((feedback) => (
                    <RoadmapCard
                      boardSlug={boardSlug}
                      feedback={feedback}
                      key={feedback._id}
                      orgSlug={orgSlug}
                    />
                  ))}
                  {unassignedFeedback.length === 0 && (
                    <p className="py-4 text-center text-muted-foreground text-sm">
                      No items
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <h3 className="font-semibold text-lg">
                  Roadmap not configured
                </h3>
                <p className="mb-4 text-center text-muted-foreground">
                  Create tags marked as "Roadmap Lane" to enable the roadmap
                  view.
                </p>
                <Link
                  className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  params={{ orgSlug }}
                  to="/dashboard/$orgSlug/tags"
                >
                  Configure Tags
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <CreateFeedbackDialog
        boardId={board._id as Id<"boards">}
        onOpenChange={setShowCreateDialog}
        open={showCreateDialog}
      />

      <DeleteFeedbackDialog
        feedbackId={feedbackToDelete}
        onClose={() => setFeedbackToDelete(null)}
      />

      <DeleteBoardDialog
        boardId={board._id as Id<"boards">}
        onOpenChange={setShowDeleteBoardDialog}
        open={showDeleteBoardDialog}
      />
    </div>
  );
}
