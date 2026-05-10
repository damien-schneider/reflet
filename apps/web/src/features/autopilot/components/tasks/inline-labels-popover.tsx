"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { IconPlus, IconTag } from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DEFAULT_LABEL_COLOR = "gray";

type Label = Doc<"workItemLabels">;

function getLabelTriggerLabel(selectedLabels: Label[]): string {
  if (selectedLabels.length === 0) {
    return "Add label";
  }
  if (selectedLabels.length === 1) {
    return selectedLabels[0].name;
  }
  return `${selectedLabels.length} labels`;
}

export function InlineLabelsPopover({
  workItemId,
  organizationId,
  labelIds,
  labels,
  disabled,
}: {
  workItemId: Id<"autopilotWorkItems">;
  organizationId: Id<"organizations">;
  labelIds: Id<"workItemLabels">[];
  labels?: Label[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const setLabelsMutation = useMutation(
    api.autopilot.mutations.labels.setLabels
  );
  const createLabelMutation = useMutation(
    api.autopilot.mutations.labels.createLabel
  );
  const queriedLabels = useQuery(
    api.autopilot.queries.labels.listLabels,
    open && labels === undefined ? { organizationId } : "skip"
  );

  const availableLabels = labels ?? queriedLabels ?? [];
  const selectedSet = useMemo(
    () => new Set<Id<"workItemLabels">>(labelIds),
    [labelIds]
  );

  const trimmedSearch = search.trim();
  const matchingLabels = useMemo(() => {
    if (trimmedSearch.length === 0) {
      return availableLabels;
    }
    const lower = trimmedSearch.toLowerCase();
    return availableLabels.filter((label) =>
      label.name.toLowerCase().includes(lower)
    );
  }, [availableLabels, trimmedSearch]);

  const exactMatch = availableLabels.find(
    (label) => label.name.toLowerCase() === trimmedSearch.toLowerCase()
  );

  const selectedLabels = availableLabels.filter((label) =>
    selectedSet.has(label._id)
  );

  const handleToggle = async (labelId: Id<"workItemLabels">) => {
    const next = new Set(selectedSet);
    if (next.has(labelId)) {
      next.delete(labelId);
    } else {
      next.add(labelId);
    }
    try {
      await setLabelsMutation({
        workItemId,
        labelIds: Array.from(next),
      });
    } catch {
      toast.error("Failed to update labels");
    }
  };

  const handleCreate = async () => {
    if (trimmedSearch.length === 0) {
      return;
    }
    try {
      const newLabelId = await createLabelMutation({
        organizationId,
        name: trimmedSearch,
        color: DEFAULT_LABEL_COLOR,
      });
      const next = new Set(selectedSet);
      next.add(newLabelId);
      await setLabelsMutation({
        workItemId,
        labelIds: Array.from(next),
      });
      setSearch("");
      toast.success(`Created label "${trimmedSearch}"`);
    } catch {
      toast.error("Failed to create label");
    }
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <button
            aria-label="Manage labels"
            className="inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-xs transition-colors hover:bg-muted"
            disabled={disabled}
            onClick={(event) => event.stopPropagation()}
            type="button"
          />
        }
      >
        <IconTag className="size-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">
          {getLabelTriggerLabel(selectedLabels)}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 gap-2 p-2"
        onClick={(event) => event.stopPropagation()}
      >
        <Input
          aria-label="Search labels"
          className="h-8 text-sm"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search labels…"
          value={search}
        />
        <div className="max-h-56 overflow-y-auto">
          {matchingLabels.length === 0 && trimmedSearch.length === 0 ? (
            <div className="px-2 py-3 text-muted-foreground text-xs">
              No labels yet.
            </div>
          ) : null}
          {matchingLabels.map((label) => {
            const checked = selectedSet.has(label._id);
            return (
              <button
                aria-pressed={checked}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors",
                  "hover:bg-muted",
                  checked && "bg-muted/40"
                )}
                key={label._id}
                onClick={() => handleToggle(label._id)}
                type="button"
              >
                <Checkbox checked={checked} />
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      label.color.startsWith("#") ||
                      label.color.startsWith("rgb")
                        ? label.color
                        : undefined,
                  }}
                />
                <span className="flex-1 truncate">{label.name}</span>
              </button>
            );
          })}
        </div>
        {trimmedSearch.length > 0 && !exactMatch ? (
          <button
            className="flex w-full items-center gap-2 rounded-sm border border-dashed px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
            onClick={handleCreate}
            type="button"
          >
            <IconPlus className="size-3.5" />
            <span>
              Create <span className="font-medium">"{trimmedSearch}"</span>
            </span>
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
