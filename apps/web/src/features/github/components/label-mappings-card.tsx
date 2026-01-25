"use client";

import { Plus, Tag, Trash } from "@phosphor-icons/react";
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
  id: string;
  name: string;
  color: string;
  description: string | null;
}

interface Board {
  _id: string;
  name: string;
  slug: string;
}

interface RefletTag {
  _id: string;
  name: string;
  color: string;
}

interface LabelMapping {
  _id: string;
  githubLabelName: string;
  githubLabelColor?: string;
  targetBoardId?: string;
  targetTagId?: string;
  autoSync: boolean;
  syncClosedIssues?: boolean;
  defaultStatus?: string;
  boardName?: string;
  tagName?: string;
  tagColor?: string;
}

interface LabelMappingsCardProps {
  mappings: LabelMapping[];
  githubLabels: GitHubLabel[];
  boards: Board[];
  tags: RefletTag[];
  isAdmin: boolean;
  isLoadingLabels: boolean;
  onAddMapping: (mapping: {
    githubLabelName: string;
    githubLabelColor?: string;
    targetBoardId?: string;
    targetTagId?: string;
    autoSync: boolean;
    syncClosedIssues?: boolean;
    defaultStatus?: string;
  }) => void;
  onDeleteMapping: (mappingId: string) => void;
  onFetchLabels: () => void;
}

export function LabelMappingsCard({
  mappings,
  githubLabels,
  boards,
  tags,
  isAdmin,
  isLoadingLabels,
  onAddMapping,
  onDeleteMapping,
  onFetchLabels,
}: LabelMappingsCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string>("");
  const [selectedBoard, setSelectedBoard] = useState<string>("");
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
    if (!(selectedLabel && selectedBoard)) {
      return;
    }

    const label = githubLabels.find((l) => l.name === selectedLabel);

    onAddMapping({
      githubLabelName: selectedLabel,
      githubLabelColor: label?.color,
      targetBoardId: selectedBoard,
      targetTagId: selectedTag || undefined,
      autoSync,
      syncClosedIssues,
    });

    // Reset form
    setSelectedLabel("");
    setSelectedBoard("");
    setSelectedTag("");
    setAutoSync(true);
    setSyncClosedIssues(false);
    setIsDialogOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Label Mappings
              </CardTitle>
              <CardDescription>
                Map GitHub labels to boards and tags for automatic issue sync
              </CardDescription>
            </div>
            {isAdmin ? (
              <Button onClick={handleOpenDialog} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Mapping
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
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
                    <Text className="text-muted-foreground">→</Text>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{mapping.boardName}</Badge>
                      {mapping.tagName ? (
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
                      ) : null}
                    </div>
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
            <div className="py-8 text-center">
              <Tag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <Text className="mb-2 text-muted-foreground">
                No label mappings configured
              </Text>
              <Text className="text-muted-foreground text-sm">
                Add a mapping to sync GitHub issues with specific labels to your
                boards
              </Text>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Label Mapping</DialogTitle>
            <DialogDescription>
              Map a GitHub label to a Reflet board. Issues with this label will
              be synced automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>GitHub Label</Label>
              <Select onValueChange={setSelectedLabel} value={selectedLabel}>
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
              <Label>Target Board</Label>
              <Select onValueChange={setSelectedBoard} value={selectedBoard}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a board" />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((board) => (
                    <SelectItem key={board._id} value={board._id}>
                      {board.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tag (optional)</Label>
              <Select onValueChange={setSelectedTag} value={selectedTag}>
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
            <Button
              disabled={!(selectedLabel && selectedBoard)}
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
