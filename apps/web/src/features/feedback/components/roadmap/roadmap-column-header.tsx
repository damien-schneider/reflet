"use client";

import { Check, Palette, Trash, X } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useTheme } from "next-themes";
import { useState } from "react";

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
  const [draftName, setDraftName] = useState<string | null>(null);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const updateStatus = useMutation(api.organizations.statuses.update);

  // Get the display color - migrate hex colors to named colors for display
  const displayColor: TagColor = isValidTagColor(color)
    ? color
    : migrateHexToNamedColor(color);
  const textColor = getTagTextColor(displayColor, isDark);
  const editedName = draftName ?? name;
  const hasUnsavedChanges = draftName !== null && draftName !== name;

  const handleNameChange = (newName: string) => {
    setDraftName(newName === name ? null : newName);
  };

  const handleSave = async () => {
    const trimmedName = editedName.trim();
    if (trimmedName && trimmedName !== name) {
      await updateStatus({ id: statusId, name: trimmedName });
    }
    setDraftName(null);
  };

  const handleCancel = () => {
    setDraftName(null);
  };

  const handleColorChange = async (newColor: TagColor) => {
    await updateStatus({ id: statusId, color: newColor });
    setIsColorPickerOpen(false);
  };

  return (
    <div className="mb-3 flex items-center gap-2">
      {/* Color picker button (only for admins) */}
      {isAdmin && (
        <Popover onOpenChange={setIsColorPickerOpen} open={isColorPickerOpen}>
          <PopoverTrigger
            render={(props) => (
              <button
                {...props}
                className="flex size-5 shrink-0 items-center justify-center rounded transition-opacity hover:opacity-70"
                style={{ color: textColor }}
                title="Change color"
                type="button"
              >
                <Palette className="size-4" weight="fill" />
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
            className="size-6 shrink-0"
            onClick={handleSave}
            size="icon"
            variant="ghost"
          >
            <Check className="size-3" />
          </Button>
          <Button
            className="size-6 shrink-0"
            onClick={handleCancel}
            size="icon"
            variant="ghost"
          >
            <X className="size-3" />
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
              className="size-6 shrink-0 text-destructive opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              onClick={onDelete}
              size="icon"
              variant="ghost"
            >
              <Trash className="size-3" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
