"use client";

import { Badge, type BadgeProps } from "@ctrl-ui/react/ui/badge";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { Plus, Tag, Trash } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useState } from "react";
import { TagBadge } from "@/components/tag-badge";
import { getTagColorValues } from "@/lib/tag-colors";
import { SettingSwitchRow } from "./setting-switch-row";
import { SwatchSelectField } from "./swatch-select-field";

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

interface NewLabelMapping {
  autoSync: boolean;
  defaultStatus?: IssueStatus;
  githubLabelColor?: string;
  githubLabelName: string;
  syncClosedIssues?: boolean;
  targetTagId?: Id<"tags">;
}

interface LabelMappingsCardProps {
  githubLabels: GitHubLabel[];
  isAdmin: boolean;
  isLoadingLabels: boolean;
  mappings: LabelMapping[];
  onAddMapping: (mapping: NewLabelMapping) => void;
  onDeleteMapping: (mappingId: Id<"githubLabelMappings">) => void;
  onFetchLabels: () => void;
  tags: RefletTag[];
}

const SIX_DIGIT_HEX = /^#?([\da-f]{6})$/i;
const LIGHT_FILL_LUMINANCE = 0.5;

function githubLabelInk(hex: string): string {
  const digits = SIX_DIGIT_HEX.exec(hex)?.[1];
  const luminance = digits
    ? (0.299 * Number.parseInt(digits.slice(0, 2), 16) +
        0.587 * Number.parseInt(digits.slice(2, 4), 16) +
        0.114 * Number.parseInt(digits.slice(4, 6), 16)) /
      255
    : 0;
  return luminance > LIGHT_FILL_LUMINANCE
    ? "var(--band)"
    : "var(--band-foreground)";
}

function githubLabelKnobs(color: string | undefined): BadgeProps["style"] {
  if (!color) {
    return;
  }
  const fill = `#${color}`;
  return {
    "--cui-badge-background": fill,
    "--cui-badge-foreground": githubLabelInk(fill),
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
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="flex min-w-0 items-center gap-3">
        <Badge
          className="min-w-0 max-w-48"
          size="sm"
          style={githubLabelKnobs(mapping.githubLabelColor)}
          title={mapping.githubLabelName}
        >
          <span className="truncate">{mapping.githubLabelName}</span>
        </Badge>
        {mapping.tagName ? (
          <>
            <span aria-hidden="true" className="text-muted-foreground">
              →
            </span>
            <span className="sr-only">maps to</span>
            <TagBadge
              className="min-w-0 max-w-48"
              color={mapping.tagColor}
              size="sm"
              title={mapping.tagName}
            >
              <span className="truncate">{mapping.tagName}</span>
            </TagBadge>
          </>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {mapping.autoSync ? (
          <Badge size="sm" variant="outline">
            Auto-sync
          </Badge>
        ) : null}
        {isAdmin ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={`Remove the ${mapping.githubLabelName} mapping`}
                  iconOnly
                  onClick={onDelete}
                  size="sm"
                  variant="ghost"
                >
                  <Trash aria-hidden="true" className="size-4" />
                </Button>
              }
            />
            <TooltipContent>Remove mapping</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </li>
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

  const handleOpenDialog = () => {
    if (githubLabels.length === 0) {
      onFetchLabels();
    }
    setIsDialogOpen(true);
  };

  return (
    <>
      <div className="space-y-3">
        {isAdmin ? (
          <div className="flex justify-end">
            <Button onClick={handleOpenDialog} size="xs" variant="surface">
              <Plus
                aria-hidden="true"
                className="size-4"
                data-icon="inline-start"
              />
              Add mapping
            </Button>
          </div>
        ) : null}
        {mappings.length > 0 ? (
          <ul className="space-y-3">
            {mappings.map((mapping) => (
              <MappingRow
                isAdmin={isAdmin}
                key={mapping._id}
                mapping={mapping}
                onDelete={() => onDeleteMapping(mapping._id)}
              />
            ))}
          </ul>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia>
                <Tag aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No label mappings yet</EmptyTitle>
              <EmptyDescription>
                Map a GitHub label to a Reflet tag to sync issues by label.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>

      <AddLabelMappingDialog
        githubLabels={githubLabels}
        isLoadingLabels={isLoadingLabels}
        onAddMapping={onAddMapping}
        onOpenChange={setIsDialogOpen}
        open={isDialogOpen}
        tags={tags}
      />
    </>
  );
}

function AddLabelMappingDialog({
  githubLabels,
  isLoadingLabels,
  onAddMapping,
  onOpenChange,
  open,
  tags,
}: Pick<
  LabelMappingsCardProps,
  "githubLabels" | "isLoadingLabels" | "onAddMapping" | "tags"
> & {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [selectedLabel, setSelectedLabel] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [autoSync, setAutoSync] = useState(true);
  const [syncClosedIssues, setSyncClosedIssues] = useState(false);

  const handleAddMapping = () => {
    if (!selectedLabel) {
      return;
    }
    onAddMapping({
      autoSync,
      githubLabelColor: githubLabels.find((l) => l.name === selectedLabel)
        ?.color,
      githubLabelName: selectedLabel,
      syncClosedIssues,
      targetTagId: tags.find((t) => t._id === selectedTag)?._id,
    });
    setSelectedLabel("");
    setSelectedTag("");
    setAutoSync(true);
    setSyncClosedIssues(false);
    onOpenChange(false);
  };

  const hasNoLabels = !isLoadingLabels && githubLabels.length === 0;
  let labelPlaceholder = "Select a label";
  if (isLoadingLabels) {
    labelPlaceholder = "Loading labels…";
  } else if (hasNoLabels) {
    labelPlaceholder = "No labels in this repository";
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add label mapping</DialogTitle>
          <DialogDescription className="text-pretty">
            Issues with this GitHub label sync into Reflet with the tag you
            choose.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <SwatchSelectField
            disabled={isLoadingLabels || hasNoLabels}
            id="github-label"
            label="GitHub label"
            onValueChange={setSelectedLabel}
            options={githubLabels.map((label) => ({
              fill: `#${label.color}`,
              key: label.id,
              label: label.name,
              value: label.name,
            }))}
            placeholder={labelPlaceholder}
            value={selectedLabel}
          />
          <SwatchSelectField
            emptyOptionLabel="No tag"
            id="reflet-tag"
            label="Tag (optional)"
            onValueChange={setSelectedTag}
            options={tags.map((tag) => ({
              fill: getTagColorValues(tag.color).text,
              key: tag._id,
              label: tag.name,
              value: tag._id,
            }))}
            placeholder="No tag"
            value={selectedTag}
          />
          <SettingSwitchRow
            checked={autoSync}
            description="Import new issues with this label automatically"
            id="auto-sync-mapping"
            label="Auto-sync"
            onCheckedChange={setAutoSync}
          />
          <SettingSwitchRow
            checked={syncClosedIssues}
            description="Include closed issues when syncing"
            id="sync-closed"
            label="Sync closed issues"
            onCheckedChange={setSyncClosedIssues}
          />
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="surface">
            Cancel
          </Button>
          <Button
            disabled={!selectedLabel}
            onClick={handleAddMapping}
            tone="primary"
            variant="solid"
          >
            Add mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
