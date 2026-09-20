"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { Check, Palette, Trash, X } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { NotionColorPicker } from "@/components/ui/notion-color-picker";
import { TiptapTitleEditor } from "@/components/ui/tiptap/title-editor";
import {
  getTagTextColor,
  isValidTagColor,
  migrateHexToNamedColor,
  type TagColor,
} from "@/lib/tag-colors";

interface RoadmapColumnHeaderProps {
  color: string;
  count: number;
  isAdmin: boolean;
  name: string;
  onDelete: () => void;
  statusId: Id<"organizationStatuses">;
}

export function RoadmapColumnHeader({
  statusId,
  name,
  color,
  count,
  isAdmin,
  onDelete,
}: RoadmapColumnHeaderProps) {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const updateStatus = useMutation(api.organizations.status_mutations.update);

  const displayColor: TagColor = isValidTagColor(color)
    ? color
    : migrateHexToNamedColor(color);
  const textColor = getTagTextColor(displayColor);

  useEffect(() => {
    setEditedName(name);
    setHasUnsavedChanges(false);
  }, [name]);

  const handleNameChange = (newName: string) => {
    setEditedName(newName);
    setHasUnsavedChanges(newName !== name);
  };

  const handleSave = async () => {
    const trimmedName = editedName.trim();
    if (trimmedName && trimmedName !== name) {
      await updateStatus({ id: statusId, name: trimmedName });
    }
    setHasUnsavedChanges(false);
  };

  const handleCancel = () => {
    setEditedName(name);
    setHasUnsavedChanges(false);
  };

  const handleColorChange = async (newColor: TagColor) => {
    await updateStatus({ color: newColor, id: statusId });
    setIsColorPickerOpen(false);
  };

  return (
    <div className="mb-3 flex items-center gap-2">
      {isAdmin && (
        <Popover onOpenChange={setIsColorPickerOpen} open={isColorPickerOpen}>
          <Tooltip>
            <TooltipTrigger
              aria-label="Change color"
              render={
                <PopoverTrigger
                  render={
                    <Button
                      className="h-5 w-5 shrink-0 rounded transition-opacity hover:opacity-70"
                      style={{ color: textColor }}
                      variant="quiet"
                    />
                  }
                />
              }
            >
              <Palette className="h-4 w-4" weight="fill" />
            </TooltipTrigger>
            <TooltipContent>Change color</TooltipContent>
          </Tooltip>
          <PopoverContent align="start" className="w-[200px] p-2">
            <NotionColorPicker
              onChange={handleColorChange}
              value={displayColor}
            />
          </PopoverContent>
        </Popover>
      )}

      <TiptapTitleEditor
        className="flex-1 font-semibold text-xs tracking-wide"
        disabled={!isAdmin}
        onChange={handleNameChange}
        placeholder="Status name"
        style={{ color: textColor }}
        value={editedName}
      />

      {hasUnsavedChanges && isAdmin ? (
        <>
          <Tooltip>
            <TooltipTrigger
              aria-label="Save status name"
              render={
                <Button
                  className="h-6 w-6 shrink-0"
                  iconOnly
                  onClick={handleSave}
                  variant="ghost"
                />
              }
            >
              <Check className="h-3 w-3" />
            </TooltipTrigger>
            <TooltipContent>Save</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              aria-label="Discard status name changes"
              render={
                <Button
                  className="h-6 w-6 shrink-0"
                  iconOnly
                  onClick={handleCancel}
                  variant="ghost"
                />
              }
            >
              <X className="h-3 w-3" />
            </TooltipTrigger>
            <TooltipContent>Cancel</TooltipContent>
          </Tooltip>
        </>
      ) : (
        <>
          <Badge className="ml-auto shrink-0 tabular-nums">{count}</Badge>

          {isAdmin && (
            <Tooltip>
              <TooltipTrigger
                aria-label={`Delete ${name} status`}
                render={
                  <Button
                    className="pointer-fine:pointer-events-none h-6 w-6 shrink-0 text-destructive pointer-fine:opacity-0 transition-opacity focus-visible:pointer-events-auto focus-visible:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100"
                    iconOnly
                    onClick={onDelete}
                    variant="ghost"
                  />
                }
              >
                <Trash className="h-3 w-3" />
              </TooltipTrigger>
              <TooltipContent>Delete status</TooltipContent>
            </Tooltip>
          )}
        </>
      )}
    </div>
  );
}
