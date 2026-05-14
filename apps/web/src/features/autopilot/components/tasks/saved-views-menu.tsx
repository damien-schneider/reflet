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
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

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

import {
  TASK_GROUP_BY,
  TASK_SORT_KEYS,
  TASK_VIEW_MODES,
  type TaskFilters,
} from "./use-tasks-filters";

type SavedView = Doc<"userViews">;

const storedFiltersSchema = z.object({
  status: z.array(z.string()).optional(),
  type: z.array(z.string()).optional(),
  priority: z.array(z.string()).optional(),
  assigneeUserId: z.string().optional(),
  assignedAgent: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  q: z.string().optional(),
  groupBy: z.enum(TASK_GROUP_BY).optional(),
  sortKey: z.enum(TASK_SORT_KEYS).optional(),
  viewMode: z.enum(TASK_VIEW_MODES).optional(),
});

interface SavedViewsMenuProps {
  applyFilters: (next: Partial<TaskFilters>) => void;
  filters: TaskFilters;
  isAdmin: boolean;
  organizationId: Id<"organizations">;
}

function viewMatchesFilters(view: SavedView, filters: TaskFilters): boolean {
  const stored = parseStoredFilters(view.filtersJson);
  if (!stored) {
    return false;
  }
  return JSON.stringify(stored) === JSON.stringify(serializeFilters(filters));
}

function parseStoredFilters(filtersJson: string): Partial<TaskFilters> | null {
  try {
    const parsed: unknown = JSON.parse(filtersJson);
    const result = storedFiltersSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
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

  const activeView = (views ?? []).find((view) =>
    viewMatchesFilters(view, filters)
  );

  const handleApply = (view: SavedView) => {
    const stored = parseStoredFilters(view.filtersJson);
    if (!stored) {
      toast.error("Could not load view");
      return;
    }
    applyFilters(stored);
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
            <Button
              className="h-8 gap-1.5 rounded-full bg-muted/40"
              size="sm"
              variant="outline"
            />
          }
        >
          <IconBookmark className="size-3.5" />
          {activeView ? activeView.name : "All tasks"}
          <IconChevronDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Saved views</DropdownMenuLabel>
          {views === undefined && (
            <p className="p-2 text-muted-foreground text-xs">Loading…</p>
          )}
          {views && views.length === 0 && (
            <p className="p-2 text-muted-foreground text-xs">
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
                  onValueChange={(value) => {
                    if (value === "personal" || value === "shared") {
                      setScope(value);
                    }
                  }}
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
