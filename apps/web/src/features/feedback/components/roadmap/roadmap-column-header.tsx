"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { toast } from "@ctrl-ui/react/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { Check, Palette, Trash, X } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { STATUS_DEFINITIONS } from "@reflet/backend/convex/organizations/status_definitions";
import { useMutation } from "convex/react";
import { useState } from "react";
import { NotionColorPicker } from "@/components/ui/notion-color-picker";
import { TiptapTitleEditor } from "@/components/ui/tiptap/title-editor";
import { resolveTagColor, type TagColor } from "@/lib/tag-colors";
import { StatusMeaningSelect } from "./status-meaning-select";

interface RoadmapColumnHeaderProps {
  color: string;
  count: number;
  isAdmin: boolean;
  name: string;
  onDelete: () => void;
  semanticStatus?: Doc<"feedback">["status"];
  statusId: Id<"organizationStatuses">;
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={label}
        render={<Button iconOnly onClick={onClick} size="xs" variant="ghost" />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function RoadmapColumnHeader({
  statusId,
  semanticStatus,
  name,
  color,
  count,
  isAdmin,
  onDelete,
}: RoadmapColumnHeaderProps) {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [draftName, setDraftName] = useState<string | null>(null);

  const updateStatus = useMutation(api.organizations.status_mutations.update);

  const displayColor = resolveTagColor(color);
  const hasUnsavedChanges = draftName !== null && draftName !== name;

  const handleSave = async () => {
    const trimmedName = draftName?.trim();
    try {
      if (trimmedName && trimmedName !== name) {
        await updateStatus({ id: statusId, name: trimmedName });
      }
      setDraftName(null);
    } catch {
      toast.error("Couldn’t rename this column. Try again.");
    }
  };

  const handleColorChange = async (newColor: TagColor) => {
    try {
      await updateStatus({ color: newColor, id: statusId });
      setIsColorPickerOpen(false);
    } catch {
      toast.error("Couldn’t change the color. Try again.");
    }
  };

  return (
    <div className="mb-3 space-y-2">
      <div className="flex items-center gap-1.5">
        {isAdmin && (
          <Popover onOpenChange={setIsColorPickerOpen} open={isColorPickerOpen}>
            <Tooltip>
              <TooltipTrigger
                aria-label={`Change ${name} color`}
                render={
                  <PopoverTrigger
                    render={<Button iconOnly size="xs" variant="ghost" />}
                  />
                }
              >
                <Palette aria-hidden weight="fill" />
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
          className="min-w-0 flex-1 font-semibold text-xs tracking-wide"
          disabled={!isAdmin}
          onChange={setDraftName}
          placeholder="Status name"
          value={draftName ?? name}
        />

        {hasUnsavedChanges && isAdmin ? (
          <>
            <IconAction label="Save name" onClick={handleSave}>
              <Check aria-hidden />
            </IconAction>
            <IconAction
              label="Discard changes"
              onClick={() => setDraftName(null)}
            >
              <X aria-hidden />
            </IconAction>
          </>
        ) : (
          <>
            <Badge className="ml-auto tabular-nums" size="sm">
              {count}
            </Badge>
            {isAdmin && (
              <Tooltip>
                <TooltipTrigger
                  aria-label={`Delete ${name} column`}
                  render={
                    <Button
                      className="pointer-fine:opacity-0 focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100"
                      iconOnly
                      onClick={onDelete}
                      size="xs"
                      tone="danger"
                      variant="ghost"
                    />
                  }
                >
                  <Trash aria-hidden />
                </TooltipTrigger>
                <TooltipContent>Delete column</TooltipContent>
              </Tooltip>
            )}
          </>
        )}
      </div>
      {semanticStatus ? (
        <p className="text-muted-foreground text-xs">
          Lifecycle: {STATUS_DEFINITIONS[semanticStatus].name}
        </p>
      ) : null}
      {!semanticStatus && isAdmin && (
        <StatusMeaningSelect
          onChange={(meaning) =>
            updateStatus({ id: statusId, semanticStatus: meaning }).catch(() =>
              toast.error("Could not set lifecycle meaning")
            )
          }
        />
      )}
      {!(semanticStatus || isAdmin) && (
        <p className="text-muted-foreground text-xs">
          Lifecycle meaning has not been configured
        </p>
      )}
    </div>
  );
}
