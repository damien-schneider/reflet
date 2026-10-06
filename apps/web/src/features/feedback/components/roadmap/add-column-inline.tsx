"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { toast } from "@ctrl-ui/react/ui/toast";
import { Plus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import type { TagColor } from "@reflet/backend/convex/feedback/tag_colors";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { NotionColorPicker } from "@/components/ui/notion-color-picker";
import { getTagSwatchClass } from "@/lib/tag-colors";
import { StatusMeaningSelect } from "./status-meaning-select";

interface AddColumnInlineProps {
  organizationId: Id<"organizations">;
}

export function AddColumnInline({ organizationId }: AddColumnInlineProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [semanticStatus, setSemanticStatus] =
    useState<Doc<"feedback">["status"]>("open");
  const [name, setName] = useState("");
  const [color, setColor] = useState<TagColor>("blue");
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const createStatus = useMutation(api.organizations.status_mutations.create);

  const reset = () => {
    setIsAdding(false);
    setName("");
    setColor("blue");
    setSemanticStatus("open");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }
    setIsSaving(true);
    try {
      await createStatus({
        color,
        name: trimmedName,
        organizationId,
        semanticStatus,
      });
      reset();
    } catch {
      toast.error("Couldn’t add the column. Try again.");
    }
    setIsSaving(false);
  };

  if (!isAdding) {
    return (
      <div className="w-72 shrink-0">
        <Button
          className="h-full min-h-48 w-full border border-dashed"
          onClick={() => setIsAdding(true)}
          variant="ghost"
        >
          <Plus aria-hidden />
          Add column
        </Button>
      </div>
    );
  }

  return (
    <form
      className="grid w-72 shrink-0 content-start gap-3 rounded-lg border bg-muted/30 p-4"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center gap-2">
        <Popover onOpenChange={setIsColorPickerOpen} open={isColorPickerOpen}>
          <PopoverTrigger
            aria-label="Column color"
            render={<Button iconOnly size="sm" variant="surface" />}
          >
            <span
              aria-hidden
              className={cn("size-3 rounded-full", getTagSwatchClass(color))}
            />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[200px] p-2">
            <NotionColorPicker
              onChange={(newColor) => {
                setColor(newColor);
                setIsColorPickerOpen(false);
              }}
              value={color}
            />
          </PopoverContent>
        </Popover>
        <Input
          aria-label="Column name"
          autoComplete="off"
          autoFocus
          className="flex-1"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              reset();
            }
          }}
          placeholder="e.g. Up next"
          value={name}
        />
      </div>
      <StatusMeaningSelect
        onChange={setSemanticStatus}
        value={semanticStatus}
      />
      <p className="text-muted-foreground text-xs">
        Renaming the column will keep this lifecycle meaning.
      </p>
      <div className="flex justify-end gap-2">
        <Button onClick={reset} size="xs" type="button" variant="ghost">
          Cancel
        </Button>
        <Button
          disabled={isSaving || !name.trim()}
          size="xs"
          type="submit"
          variant="solid"
        >
          {isSaving ? "Adding…" : "Add column"}
        </Button>
      </div>
    </form>
  );
}
