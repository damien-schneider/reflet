"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ctrl-ui/react/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Field, FieldLabel } from "@ctrl-ui/react/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import { Switch } from "@ctrl-ui/react/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { Plus, Tag, Trash } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { CSSProperties } from "react";
import { useState } from "react";
import { Label } from "@/components/ui/label";
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

const SIX_DIGIT_HEX = /^#?([\da-f]{6})$/i;
const LIGHT_FILL_LUMINANCE = 0.5;
const SWATCH_CLASS = "h-3 w-3 rounded-full bg-(--label-fill)";
const CHIP_CLASS = "bg-(--label-fill) text-(--label-ink)";

function labelVars(color: string | undefined): CSSProperties | undefined {
  if (!color) {
    return;
  }
  const digits = SIX_DIGIT_HEX.exec(color)?.[1];
  const luminance = digits
    ? (0.299 * Number.parseInt(digits.slice(0, 2), 16) +
        0.587 * Number.parseInt(digits.slice(2, 4), 16) +
        0.114 * Number.parseInt(digits.slice(4, 6), 16)) /
      255
    : 0;
  return {
    "--label-fill": color,
    "--label-ink":
      luminance > LIGHT_FILL_LUMINANCE
        ? "var(--band)"
        : "var(--band-foreground)",
  };
}

function MappingRow({
  mapping,
  isAdmin,
  onDelete,
}: {
  isAdmin: boolean;
  mapping: LabelMapping;
  onDelete: () => void;
}) {
  const labelFill = mapping.githubLabelColor
    ? `#${mapping.githubLabelColor}`
    : undefined;
  const tagFill = mapping.tagColor ? `#${mapping.tagColor}` : undefined;

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <Badge
          className={labelFill ? CHIP_CLASS : undefined}
          style={labelVars(labelFill)}
        >
          {mapping.githubLabelName}
        </Badge>
        {mapping.tagName && (
          <>
            <Text className="text-muted-foreground">→</Text>
            <Badge
              className={tagFill ? CHIP_CLASS : undefined}
              style={labelVars(tagFill)}
            >
              {mapping.tagName}
            </Badge>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {mapping.autoSync ? <Badge>Auto-sync</Badge> : null}
        {isAdmin ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={`Remove the ${mapping.githubLabelName} mapping`}
                  iconOnly
                  onClick={onDelete}
                  variant="ghost"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              }
            />
            <TooltipContent>Remove mapping</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
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
      autoSync,
      githubLabelColor: label?.color,
      githubLabelName: selectedLabel,
      syncClosedIssues,
      targetTagId: tags.find((t) => t._id === selectedTag)?._id,
    });

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
            <Button onClick={handleOpenDialog} size="xs" variant="surface">
              <Plus className="mr-2 h-4 w-4" />
              Add Mapping
            </Button>
          </div>
        ) : null}
        {mappings.length > 0 ? (
          <div className="space-y-3">
            {mappings.map((mapping) => (
              <MappingRow
                isAdmin={isAdmin}
                key={mapping._id}
                mapping={mapping}
                onDelete={() => onDeleteMapping(mapping._id)}
              />
            ))}
          </div>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia>
                <Tag />
              </EmptyMedia>
              <EmptyTitle>No label mappings yet</EmptyTitle>
              <EmptyDescription>
                Map a GitHub label to a Reflet tag to sync issues by label.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
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
            <Field>
              <FieldLabel htmlFor="github-label">GitHub Label</FieldLabel>
              <Select
                onValueChange={(value) => setSelectedLabel(value ?? "")}
                value={selectedLabel}
              >
                <SelectTrigger id="github-label">
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
                          className={SWATCH_CLASS}
                          style={labelVars(`#${label.color}`)}
                        />
                        {label.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="reflet-tag">Tag (optional)</FieldLabel>
              <Select
                onValueChange={(value) => setSelectedTag(value ?? "")}
                value={selectedTag}
              >
                <SelectTrigger id="reflet-tag">
                  <SelectValue placeholder="Select a tag (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {tags.map((tag) => (
                    <SelectItem key={tag._id} value={tag._id}>
                      <div className="flex items-center gap-2">
                        <div
                          className={SWATCH_CLASS}
                          style={labelVars(tag.color)}
                        />
                        {tag.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

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
            <Button onClick={() => setIsDialogOpen(false)} variant="surface">
              Cancel
            </Button>
            <Button
              disabled={!selectedLabel}
              onClick={handleAddMapping}
              tone="primary"
              variant="solid"
            >
              Add Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
