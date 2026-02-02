"use client";

import { Check, Palette, Trash, X } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NotionColorPicker } from "@/components/ui/notion-color-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TiptapTitleEditor } from "@/components/ui/tiptap/title-editor";
import {
  getTagTextColor,
  isValidTagColor,
  migrateHexToNamedColor,
  type TagColor,
} from "@/lib/tag-colors";

interface RoadmapColumnHeaderProps {
  statusId: Id<"organizationStatuses">;
  name: string;
  color: string;
  count: number;
  isAdmin: boolean;
  onDelete: () => void;
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

  const updateStatus = useMutation(api.organization_statuses.update);

  // Get the display color - migrate hex colors to named colors for display
  const displayColor: TagColor = isValidTagColor(color)
    ? color
    : migrateHexToNamedColor(color);
  const textColor = getTagTextColor(displayColor);

  // Sync local state when prop changes
  useEffect(() => {
    setEditedName(name);
    setHasUnsavedChanges(false);
  }, [name]);

  const handleNameChange = useCallback(
    (newName: string) => {
      setEditedName(newName);
      setHasUnsavedChanges(newName !== name);
    },
    [name]
  );

  const handleSave = useCallback(async () => {
    const trimmedName = editedName.trim();
    if (trimmedName && trimmedName !== name) {
      await updateStatus({ id: statusId, name: trimmedName });
    }
    setHasUnsavedChanges(false);
  }, [editedName, name, statusId, updateStatus]);

  const handleCancel = useCallback(() => {
    setEditedName(name);
    setHasUnsavedChanges(false);
  }, [name]);

  const handleColorChange = useCallback(
    async (newColor: TagColor) => {
      await updateStatus({ id: statusId, color: newColor });
      setIsColorPickerOpen(false);
    },
    [statusId, updateStatus]
  );

  return (
    <div className="mb-3 flex items-center gap-2">
      {/* Color picker button (only for admins) */}
      {isAdmin && (
        <Popover onOpenChange={setIsColorPickerOpen} open={isColorPickerOpen}>
          <PopoverTrigger
            render={(props) => (
              <button
                {...props}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded transition-opacity hover:opacity-70"
                style={{ color: textColor }}
                title="Change color"
                type="button"
              >
                <Palette className="h-4 w-4" weight="fill" />
              </button>
            )}
          />
          <PopoverContent align="start" className="w-[200px] p-2">
            <NotionColorPicker
              onChange={handleColorChange}
              value={displayColor}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Title - inline editable with color */}
      <TiptapTitleEditor
        className="flex-1 font-semibold text-xs tracking-wide"
        disabled={!isAdmin}
        onChange={handleNameChange}
        placeholder="Status name"
        style={{ color: textColor }}
        value={editedName}
      />

      {/* Save/Cancel buttons when there are unsaved changes */}
      {hasUnsavedChanges && isAdmin ? (
        <>
          <Button
            className="h-6 w-6 shrink-0"
            onClick={handleSave}
            size="icon"
            variant="ghost"
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            className="h-6 w-6 shrink-0"
            onClick={handleCancel}
            size="icon"
            variant="ghost"
          >
            <X className="h-3 w-3" />
          </Button>
        </>
      ) : (
        <>
          {/* Count badge */}
          <Badge className="ml-auto shrink-0" variant="secondary">
            {count}
          </Badge>

          {/* Admin actions - just delete */}
          {isAdmin && (
            <Button
              className="h-6 w-6 shrink-0 text-destructive opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              onClick={onDelete}
              size="icon"
              variant="ghost"
            >
              <Trash className="h-3 w-3" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
