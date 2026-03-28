"use client";

import { Plus, Trash } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useState } from "react";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [autoSync, setAutoSync] = useState(true);
  const [syncClosedIssues, setSyncClosedIssues] = useState(false);

  const handleOpenDialog = () => {
    if (githubLabels.length === 0) {
      onFetchLabels();
    }
    setIsDialogOpen(true);
  };

  const handleAddMapping = () => {
    if (!selectedLabel) {
      return;
    }

    const label = githubLabels.find((l) => l.name === selectedLabel);

    onAddMapping({
      githubLabelName: selectedLabel,
      githubLabelColor: label?.color,
      targetTagId: tags.find((t) => t._id === selectedTag)?._id,
      autoSync,
      syncClosedIssues,
    });

    // Reset form
    setSelectedLabel("");
    setSelectedTag("");
    setAutoSync(true);
    setSyncClosedIssues(false);
    setIsDialogOpen(false);
  };

  return (
    <>
      <div className="space-y-3">
        {isAdmin ? (
          <div className="flex justify-end">
            <Button onClick={handleOpenDialog} size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
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
                      <Trash className="h-4 w-4" />
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

      <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
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
                onValueChange={(value) => setSelectedLabel(value ?? "")}
                value={selectedLabel}
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
                          className="h-3 w-3 rounded-full"
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
                onValueChange={(value) => setSelectedTag(value ?? "")}
                value={selectedTag}
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
                          className="h-3 w-3 rounded-full"
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
                checked={autoSync}
                id="auto-sync-mapping"
                onCheckedChange={setAutoSync}
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
                checked={syncClosedIssues}
                id="sync-closed"
                onCheckedChange={setSyncClosedIssues}
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button disabled={!selectedLabel} onClick={handleAddMapping}>
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
