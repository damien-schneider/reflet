"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";

const PRESET_COLORS = [
  { name: "Gray", value: "#6b7280" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
] as const;

interface StatusManagerProps {
  boardId: Id<"boards">;
}

export function StatusManager({ boardId }: StatusManagerProps) {
  const statuses = useQuery(api.board_statuses.list, { boardId });
  const counts = useQuery(api.board_statuses.getCounts, { boardId });
  const createStatus = useMutation(api.board_statuses.create);
  const updateStatus = useMutation(api.board_statuses.update);
  const deleteStatus = useMutation(api.board_statuses.remove);

  const [editingStatus, setEditingStatus] =
    useState<Doc<"boardStatuses"> | null>(null);
  const [deletingStatus, setDeletingStatus] =
    useState<Doc<"boardStatuses"> | null>(null);
  const [moveToStatusId, setMoveToStatusId] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState(PRESET_COLORS[0].value);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleCreate = useCallback(async () => {
    if (!newStatusName.trim()) {
      return;
    }
    await createStatus({
      boardId,
      name: newStatusName.trim(),
      color: newStatusColor,
    });
    setNewStatusName("");
    setNewStatusColor(PRESET_COLORS[0].value);
    setIsCreating(false);
  }, [boardId, createStatus, newStatusName, newStatusColor]);

  const handleStartEdit = useCallback((status: Doc<"boardStatuses">) => {
    setEditingStatus(status);
    setEditName(status.name);
    setEditColor(status.color);
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!editingStatus) {
      return;
    }
    await updateStatus({
      id: editingStatus._id,
      name: editName.trim() || undefined,
      color: editColor || undefined,
    });
    setEditingStatus(null);
    setEditName("");
    setEditColor("");
  }, [editingStatus, updateStatus, editName, editColor]);

  const handleStartDelete = useCallback((status: Doc<"boardStatuses">) => {
    setDeletingStatus(status);
    setMoveToStatusId("");
  }, []);

  const handleDelete = useCallback(async () => {
    if (!(deletingStatus && moveToStatusId)) {
      return;
    }
    await deleteStatus({
      id: deletingStatus._id,
      moveToStatusId: moveToStatusId as Id<"boardStatuses">,
    });
    setDeletingStatus(null);
    setMoveToStatusId("");
  }, [deletingStatus, deleteStatus, moveToStatusId]);

  if (!statuses) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton className="h-12 w-full" key={`skeleton-${i}-${boardId}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Board Statuses</h3>
          <p className="text-muted-foreground text-sm">
            Configure the statuses available for feedback on this board.
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Add Status
        </Button>
      </div>

      <div className="space-y-2">
        {statuses.map((status) => (
          <div
            className="flex items-center gap-3 rounded-lg border p-3"
            key={status._id}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <div
              className="h-4 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: status.color }}
            />
            <span className="flex-1 font-medium text-sm">{status.name}</span>
            <Badge variant="secondary">{counts?.[status._id] ?? 0} items</Badge>
            <Button
              onClick={() => handleStartEdit(status)}
              size="icon-xs"
              variant="ghost"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              disabled={statuses.length <= 1}
              onClick={() => handleStartDelete(status)}
              size="icon-xs"
              variant="ghost"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog onOpenChange={setIsCreating} open={isCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Status</DialogTitle>
            <DialogDescription>
              Add a new status to your board roadmap.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status-name">Name</Label>
              <Input
                id="status-name"
                onChange={(e) => setNewStatusName(e.target.value)}
                placeholder="e.g., In Progress"
                value={newStatusName}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status-color">Color</Label>
              <Select
                onValueChange={(value) => value && setNewStatusColor(value)}
                value={newStatusColor}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_COLORS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: color.value }}
                        />
                        {color.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsCreating(false)} variant="outline">
              Cancel
            </Button>
            <Button disabled={!newStatusName.trim()} onClick={handleCreate}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        onOpenChange={(open) => !open && setEditingStatus(null)}
        open={!!editingStatus}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Status</DialogTitle>
            <DialogDescription>
              Update the status name and color.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                onChange={(e) => setEditName(e.target.value)}
                value={editName}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-color">Color</Label>
              <Select
                onValueChange={(value) => value && setEditColor(value)}
                value={editColor}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_COLORS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: color.value }}
                        />
                        {color.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setEditingStatus(null)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        onOpenChange={(open) => !open && setDeletingStatus(null)}
        open={!!deletingStatus}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Status</DialogTitle>
            <DialogDescription>
              Before deleting, choose where to move the{" "}
              {counts?.[deletingStatus?._id ?? ""] ?? 0} feedback items
              currently in this status.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="move-to">Move items to</Label>
              <Select
                onValueChange={(value) => value && setMoveToStatusId(value)}
                value={moveToStatusId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses
                    .filter((s) => s._id !== deletingStatus?._id)
                    .map((status) => (
                      <SelectItem key={status._id} value={status._id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: status.color }}
                          />
                          {status.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setDeletingStatus(null)} variant="outline">
              Cancel
            </Button>
            <Button
              disabled={!moveToStatusId}
              onClick={handleDelete}
              variant="destructive"
            >
              Delete Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
