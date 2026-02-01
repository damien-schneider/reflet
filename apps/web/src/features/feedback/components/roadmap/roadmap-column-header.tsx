"use client";

import { Check, Trash, X } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TiptapTitleEditor } from "@/components/ui/tiptap/title-editor";
import { COLOR_PALETTE } from "@/lib/constants";
import { cn } from "@/lib/utils";

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
    async (newColor: string) => {
      await updateStatus({ id: statusId, color: newColor });
      setIsColorPickerOpen(false);
    },
    [statusId, updateStatus]
  );

  return (
    <div className="mb-3 flex items-center gap-2">
      {/* Color dot / picker */}
      {isAdmin ? (
        <Popover onOpenChange={setIsColorPickerOpen} open={isColorPickerOpen}>
          <PopoverTrigger
            className="h-3 w-3 shrink-0 rounded-full transition-transform hover:scale-110"
            style={{ backgroundColor: color }}
            title="Change color"
          />
          <PopoverContent align="start" className="w-auto p-2">
            <div className="grid grid-cols-3 gap-1">
              {COLOR_PALETTE.map((paletteColor) => (
                <button
                  className={cn(
                    "h-6 w-6 rounded-full transition-transform hover:scale-110",
                    paletteColor === color &&
                      "ring-2 ring-primary ring-offset-2"
                  )}
                  key={paletteColor}
                  onClick={() => handleColorChange(paletteColor)}
                  style={{ backgroundColor: paletteColor }}
                  type="button"
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <div
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}

      {/* Title - inline editable for admins */}
      <TiptapTitleEditor
        className="flex-1 font-medium text-sm"
        disabled={!isAdmin}
        onChange={handleNameChange}
        placeholder="Status name"
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
