"use client";

import { Plus, Trash } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useReducer } from "react";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/typography";

interface GitHubLabel {
  color: string;
  description: string | null;
  id: string;
  name: string;
}

interface RefletTag {
  _id: Id<"tags">;
  color: string;
  name: string;
}

type IssueStatus =
  | "open"
  | "under_review"
  | "planned"
  | "in_progress"
  | "completed"
  | "closed";

interface LabelMapping {
  _id: Id<"githubLabelMappings">;
  autoSync: boolean;
  defaultStatus?: IssueStatus;
  githubLabelColor?: string;
  githubLabelName: string;
  syncClosedIssues?: boolean;
  tagColor?: string;
  tagName?: string;
  targetTagId?: Id<"tags">;
}

interface LabelMappingsCardProps {
  githubLabels: GitHubLabel[];
  isAdmin: boolean;
  isLoadingLabels: boolean;
  mappings: LabelMapping[];
  onAddMapping: (mapping: {
    githubLabelName: string;
    githubLabelColor?: string;
    targetTagId?: Id<"tags">;
    autoSync: boolean;
    syncClosedIssues?: boolean;
    defaultStatus?: IssueStatus;
  }) => void;
  onDeleteMapping: (mappingId: Id<"githubLabelMappings">) => void;
  onFetchLabels: () => void;
  tags: RefletTag[];
}

interface MappingDialogState {
  autoSync: boolean;
  isOpen: boolean;
  selectedLabel: string;
  selectedTag: string;
  syncClosedIssues: boolean;
}

type MappingDialogAction =
  | { type: "close" }
  | { type: "open" }
  | { type: "setAutoSync"; checked: boolean }
  | { type: "setSelectedLabel"; label: string }
  | { type: "setSelectedTag"; tagId: string }
  | { type: "setSyncClosedIssues"; checked: boolean };

const initialMappingDialogState: MappingDialogState = {
  autoSync: true,
  isOpen: false,
  selectedLabel: "",
  selectedTag: "",
  syncClosedIssues: false,
};

function mappingDialogReducer(
  state: MappingDialogState,
  action: MappingDialogAction
): MappingDialogState {
  if (action.type === "open") {
    return { ...state, isOpen: true };
  }
  if (action.type === "close") {
    return initialMappingDialogState;
  }
  if (action.type === "setAutoSync") {
    return { ...state, autoSync: action.checked };
  }
  if (action.type === "setSelectedLabel") {
    return { ...state, selectedLabel: action.label };
  }
  if (action.type === "setSelectedTag") {
    return { ...state, selectedTag: action.tagId };
  }
  if (action.type === "setSyncClosedIssues") {
    return { ...state, syncClosedIssues: action.checked };
  }

  const exhaustive: never = action;
  return exhaustive;
}

export function LabelMappingsSection({
  mappings,
  githubLabels,
  tags,
  isAdmin,
  isLoadingLabels,
  onAddMapping,
  onDeleteMapping,
  onFetchLabels,
}: LabelMappingsCardProps) {
  const [dialogState, dispatchDialog] = useReducer(
    mappingDialogReducer,
    initialMappingDialogState
  );

  const handleOpenDialog = () => {
    if (githubLabels.length === 0) {
      onFetchLabels();
    }
    dispatchDialog({ type: "open" });
  };

  const handleAddMapping = () => {
    if (!dialogState.selectedLabel) {
      return;
    }

    const label = githubLabels.find(
      (item) => item.name === dialogState.selectedLabel
    );

    onAddMapping({
      githubLabelName: dialogState.selectedLabel,
      githubLabelColor: label?.color,
      targetTagId: tags.find((tag) => tag._id === dialogState.selectedTag)?._id,
      autoSync: dialogState.autoSync,
      syncClosedIssues: dialogState.syncClosedIssues,
    });

    dispatchDialog({ type: "close" });
  };

  return (
    <>
      <div className="space-y-3">
        {isAdmin ? (
          <div className="flex justify-end">
            <Button onClick={handleOpenDialog} size="sm" variant="outline">
              <Plus className="mr-2 size-4" />
              Add Mapping
            </Button>
          </div>
        ) : null}
        {mappings.length > 0 ? (
          <div className="space-y-3">
            {mappings.map((mapping) => (
              <div
                className="flex items-center justify-between rounded-lg border p-3"
                key={mapping._id}
              >
                <div className="flex items-center gap-3">
                  <Badge
                    style={{
                      backgroundColor: mapping.githubLabelColor
                        ? `#${mapping.githubLabelColor}`
                        : undefined,
                      color: mapping.githubLabelColor
                        ? getContrastColor(mapping.githubLabelColor)
                        : undefined,
                    }}
                  >
                    {mapping.githubLabelName}
                  </Badge>
                  {mapping.tagName && (
                    <>
                      <Text className="text-muted-foreground">→</Text>
                      <Badge
                        style={{
                          backgroundColor: mapping.tagColor
                            ? `#${mapping.tagColor}`
                            : undefined,
                        }}
                        variant="secondary"
                      >
                        {mapping.tagName}
                      </Badge>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {mapping.autoSync ? (
                    <Badge variant="secondary">Auto-sync</Badge>
                  ) : null}
                  {isAdmin ? (
                    <Button
                      onClick={() => onDeleteMapping(mapping._id)}
                      size="icon"
                      variant="ghost"
                    >
                      <Trash className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center">
            <Text className="text-muted-foreground text-sm">
              No label mappings yet. Add one to sync issues by label.
            </Text>
          </div>
        )}
      </div>

      <Dialog
        onOpenChange={(open) =>
          dispatchDialog({ type: open ? "open" : "close" })
        }
        open={dialogState.isOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Label Mapping</DialogTitle>
            <DialogDescription>
              Map a GitHub label to a Reflet tag. Issues with this label will be
              synced automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>GitHub Label</Label>
              <Select
                onValueChange={(value) =>
                  dispatchDialog({
                    type: "setSelectedLabel",
                    label: value ?? "",
                  })
                }
                value={dialogState.selectedLabel}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isLoadingLabels ? "Loading labels..." : "Select a label"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {githubLabels.map((label) => (
                    <SelectItem key={label.id} value={label.name}>
                      <div className="flex items-center gap-2">
                        <div
                          className="size-3 rounded-full"
                          style={{ backgroundColor: `#${label.color}` }}
                        />
                        {label.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tag (optional)</Label>
              <Select
                onValueChange={(value) =>
                  dispatchDialog({
                    type: "setSelectedTag",
                    tagId: value ?? "",
                  })
                }
                value={dialogState.selectedTag}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a tag (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {tags.map((tag) => (
                    <SelectItem key={tag._id} value={tag._id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="size-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-sync-mapping">Auto-sync</Label>
                <Text className="text-muted-foreground text-sm">
                  Automatically import issues with this label
                </Text>
              </div>
              <Switch
                checked={dialogState.autoSync}
                id="auto-sync-mapping"
                onCheckedChange={(checked) =>
                  dispatchDialog({ type: "setAutoSync", checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sync-closed">Sync closed issues</Label>
                <Text className="text-muted-foreground text-sm">
                  Include closed issues when syncing
                </Text>
              </div>
              <Switch
                checked={dialogState.syncClosedIssues}
                id="sync-closed"
                onCheckedChange={(checked) =>
                  dispatchDialog({ type: "setSyncClosedIssues", checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => dispatchDialog({ type: "close" })}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!dialogState.selectedLabel}
              onClick={handleAddMapping}
            >
              Add Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Get contrasting text color for a background color
 */
function getContrastColor(hexColor: string): string {
  const r = Number.parseInt(hexColor.slice(0, 2), 16);
  const g = Number.parseInt(hexColor.slice(2, 4), 16);
  const b = Number.parseInt(hexColor.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}
