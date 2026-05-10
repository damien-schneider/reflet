"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconBookmark,
  IconCheck,
  IconChevronDown,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { TaskFilters } from "./use-tasks-filters";

type SavedView = Doc<"userViews">;

interface SavedViewsMenuProps {
  applyFilters: (next: Partial<TaskFilters>) => void;
  filters: TaskFilters;
  isAdmin: boolean;
  organizationId: Id<"organizations">;
}

function viewMatchesFilters(view: SavedView, filters: TaskFilters): boolean {
  try {
    const stored = JSON.parse(view.filtersJson) as Partial<TaskFilters>;
    return JSON.stringify(stored) === JSON.stringify(serializeFilters(filters));
  } catch {
    return false;
  }
}

function serializeFilters(filters: TaskFilters): Partial<TaskFilters> {
  // Persist all filter keys so views fully restore state.
  return {
    status: filters.status,
    type: filters.type,
    priority: filters.priority,
    assigneeUserId: filters.assigneeUserId,
    assignedAgent: filters.assignedAgent,
    labelIds: filters.labelIds,
    q: filters.q,
    groupBy: filters.groupBy,
    sortKey: filters.sortKey,
    viewMode: filters.viewMode,
  };
}

export function SavedViewsMenu({
  organizationId,
  filters,
  applyFilters,
  isAdmin,
}: SavedViewsMenuProps) {
  const views = useQuery(api.autopilot.queries.views.listViews, {
    organizationId,
  });
  const createView = useMutation(api.autopilot.mutations.views.createView);
  const deleteView = useMutation(api.autopilot.mutations.views.deleteView);

  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"personal" | "shared">("personal");
  const [isSaving, setIsSaving] = useState(false);

  const activeView = useMemo(
    () => (views ?? []).find((view) => viewMatchesFilters(view, filters)),
    [views, filters]
  );

  const handleApply = (view: SavedView) => {
    try {
      const stored = JSON.parse(view.filtersJson) as Partial<TaskFilters>;
      applyFilters(stored);
    } catch {
      toast.error("Could not load view");
    }
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("View name is required");
      return;
    }
    setIsSaving(true);
    try {
      await createView({
        organizationId,
        name: trimmed,
        scope,
        filtersJson: JSON.stringify(serializeFilters(filters)),
        sortKey: filters.sortKey,
        groupKey: filters.groupBy,
        viewMode: filters.viewMode,
      });
      toast.success("View saved");
      setName("");
      setScope("personal");
      setSaveOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save view";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (view: SavedView) => {
    try {
      await deleteView({ viewId: view._id });
      toast.success("View deleted");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not delete view";
      toast.error(message);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button className="h-8 gap-1.5" size="sm" variant="outline" />
          }
        >
          <IconBookmark className="size-3.5" />
          {activeView ? activeView.name : "All tasks"}
          <IconChevronDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Saved views</DropdownMenuLabel>
          {views === undefined && (
            <p className="px-2 py-2 text-muted-foreground text-xs">Loading…</p>
          )}
          {views && views.length === 0 && (
            <p className="px-2 py-2 text-muted-foreground text-xs">
              No saved views yet.
            </p>
          )}
          {views?.map((view) => {
            const isActive = activeView?._id === view._id;
            const canDelete = view.scope === "personal" ? true : isAdmin;
            return (
              <DropdownMenuItem
                className="flex items-center justify-between gap-2"
                key={view._id}
                onClick={() => handleApply(view)}
              >
                <span className="flex items-center gap-2">
                  {isActive ? (
                    <IconCheck className="size-3.5 text-primary" />
                  ) : (
                    <span className="size-3.5" />
                  )}
                  <span className="truncate">{view.name}</span>
                  {view.scope === "shared" && (
                    <span className="text-muted-foreground text-xs">
                      (shared)
                    </span>
                  )}
                </span>
                {canDelete && (
                  <Button
                    aria-label={`Delete view ${view.name}`}
                    className="size-6"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete(view);
                    }}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <IconTrash className="size-3.5" />
                  </Button>
                )}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSaveOpen(true)}>
            <IconPlus className="size-3.5" />
            Save current view as…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog onOpenChange={setSaveOpen} open={saveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save view</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="view-name">Name</Label>
              <Input
                autoFocus
                id="view-name"
                onChange={(event) => setName(event.target.value)}
                placeholder="My active tasks"
                value={name}
              />
            </div>
            {isAdmin && (
              <div className="space-y-1.5">
                <Label htmlFor="view-scope">Visibility</Label>
                <Select
                  onValueChange={(v) => setScope(v as "personal" | "shared")}
                  value={scope}
                >
                  <SelectTrigger id="view-scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="shared">Shared with team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose
              render={
                <Button disabled={isSaving} variant="ghost">
                  Cancel
                </Button>
              }
            />
            <Button disabled={isSaving} onClick={handleSave}>
              Save view
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
