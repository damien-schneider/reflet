import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  MessageSquare,
  MoreVertical,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/dashboard/$orgSlug/boards/")({
  component: BoardsPage,
});

function BoardsPage() {
  const { orgSlug } = Route.useParams();
  const navigate = useNavigate();
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const boards = useQuery(
    api.boards.list,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const createBoard = useMutation(api.boards.create);
  const deleteBoard = useMutation(api.boards_actions.remove);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newBoard, setNewBoard] = useState({
    name: "",
    description: "",
    isPublic: true,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<string | null>(null);

  const handleCreateBoard = async () => {
    if (!(newBoard.name.trim() && org?._id)) {
      return;
    }

    setIsCreating(true);
    try {
      await createBoard({
        organizationId: org._id as Id<"organizations">,
        name: newBoard.name.trim(),
        description: newBoard.description.trim() || undefined,
        isPublic: newBoard.isPublic,
      });
      setShowCreateDialog(false);
      setNewBoard({ name: "", description: "", isPublic: true });
    } catch (error) {
      console.error("Failed to create board:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBoard = async () => {
    if (!boardToDelete) {
      return;
    }

    try {
      await deleteBoard({ id: boardToDelete as Id<"boards"> });
      setBoardToDelete(null);
    } catch (error) {
      console.error("Failed to delete board:", error);
    }
  };

  if (!org) {
    return (
      <div className="flex h-full items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  const isAdmin = org.role === "owner" || org.role === "admin";

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">Boards</h1>
          <p className="text-muted-foreground">Manage your feedback boards</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Board
        </Button>
      </div>

      {boards && boards.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <Card
              className="group relative transition-all hover:border-primary"
              key={board._id}
            >
              <Link
                aria-label={`View ${board.name} board`}
                className="absolute inset-0 z-10"
                params={{ orgSlug, boardSlug: board.slug }}
                to="/dashboard/$orgSlug/boards/$boardSlug"
              />
              <CardHeader className="relative z-0">
                <div className="flex items-start justify-between">
                  <CardTitle className="flex-1 cursor-pointer group-hover:underline">
                    {board.name}
                  </CardTitle>
                  {isAdmin && (
                    <div className="relative z-20">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={(props) => (
                            <Button
                              {...props}
                              className="h-8 w-8"
                              size="icon"
                              variant="ghost"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          )}
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate({
                                to: "/dashboard/$orgSlug/boards/$boardSlug",
                                params: { orgSlug, boardSlug: board.slug },
                              });
                            }}
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBoardToDelete(board._id);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
                <CardDescription>
                  {board.description || "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-0">
                <div className="flex items-center gap-2">
                  {board.isPublic ? (
                    <Badge variant="outline">Public</Badge>
                  ) : (
                    <Badge variant="secondary">Private</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="font-semibold text-lg">No boards yet</h3>
            <p className="mb-4 text-muted-foreground">
              Create your first board to start collecting feedback.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Board
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Board Dialog */}
      <Dialog onOpenChange={setShowCreateDialog} open={showCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create board</DialogTitle>
            <DialogDescription>
              Create a new feedback board for your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Board name</Label>
              <Input
                id="name"
                onChange={(e) =>
                  setNewBoard({ ...newBoard, name: e.target.value })
                }
                placeholder="Feature Requests"
                value={newBoard.name}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                onChange={(e) =>
                  setNewBoard({ ...newBoard, description: e.target.value })
                }
                placeholder="Describe what this board is for..."
                value={newBoard.description}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={newBoard.isPublic}
                id="isPublic"
                onCheckedChange={(checked) =>
                  setNewBoard({ ...newBoard, isPublic: checked as boolean })
                }
              />
              <Label htmlFor="isPublic">Make this board public</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowCreateDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isCreating} onClick={handleCreateBoard}>
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        onOpenChange={() => setBoardToDelete(null)}
        open={!!boardToDelete}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete board</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this board? This will permanently
              delete all feedback, comments, and votes. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setBoardToDelete(null)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleDeleteBoard} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
