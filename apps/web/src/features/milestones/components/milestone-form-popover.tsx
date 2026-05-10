"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useReducer } from "react";

import { Button } from "@/components/ui/button";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { Input } from "@/components/ui/input";
import { NotionColorPicker } from "@/components/ui/notion-color-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TimeHorizon } from "@/lib/milestone-constants";
import {
  isTimeHorizon,
  TIME_HORIZON_CONFIG,
  TIME_HORIZONS,
} from "@/lib/milestone-constants";
import type { TagColor } from "@/lib/tag-colors";

import { MilestoneDatePicker } from "./milestone-date-picker";

interface MilestoneFormPopoverProps {
  defaultTimeHorizon: TimeHorizon;
  onCreated?: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  organizationId: Id<"organizations">;
  /** When true, show a time horizon selector in the form */
  showHorizonPicker?: boolean;
  triggerClassName?: string;
}

interface MilestoneFormState {
  color: TagColor;
  emoji?: string;
  isSubmitting: boolean;
  name: string;
  selectedTimeHorizon?: TimeHorizon;
  targetDate?: number;
}

type MilestoneFormAction =
  | { type: "reset" }
  | { type: "setColor"; color: TagColor }
  | { type: "setEmoji"; emoji: string | undefined }
  | { type: "setName"; name: string }
  | { type: "setSubmitting"; isSubmitting: boolean }
  | { type: "setTargetDate"; targetDate: number | undefined }
  | { type: "setTimeHorizon"; timeHorizon: TimeHorizon };

const initialMilestoneFormState: MilestoneFormState = {
  color: "blue",
  isSubmitting: false,
  name: "",
};

function milestoneFormReducer(
  state: MilestoneFormState,
  action: MilestoneFormAction
): MilestoneFormState {
  if (action.type === "reset") {
    return initialMilestoneFormState;
  }
  if (action.type === "setColor") {
    return { ...state, color: action.color };
  }
  if (action.type === "setEmoji") {
    return { ...state, emoji: action.emoji };
  }
  if (action.type === "setName") {
    return { ...state, name: action.name };
  }
  if (action.type === "setSubmitting") {
    return { ...state, isSubmitting: action.isSubmitting };
  }
  if (action.type === "setTargetDate") {
    return { ...state, targetDate: action.targetDate };
  }
  if (action.type === "setTimeHorizon") {
    return { ...state, selectedTimeHorizon: action.timeHorizon };
  }

  const exhaustive: never = action;
  return exhaustive;
}

export function MilestoneFormPopover({
  organizationId,
  defaultTimeHorizon,
  showHorizonPicker = false,
  open,
  onOpenChange,
  onCreated,
  triggerClassName,
}: MilestoneFormPopoverProps) {
  const createMilestone = useMutation(
    api.organizations.milestones_mutations.create
  );

  const [formState, dispatch] = useReducer(
    milestoneFormReducer,
    initialMilestoneFormState
  );
  const timeHorizon = formState.selectedTimeHorizon ?? defaultTimeHorizon;

  const handleSubmit = async () => {
    const trimmedName = formState.name.trim();
    if (!trimmedName) {
      return;
    }

    dispatch({ type: "setSubmitting", isSubmitting: true });
    try {
      await createMilestone({
        organizationId,
        name: trimmedName,
        emoji: formState.emoji,
        color: formState.color,
        timeHorizon: showHorizonPicker ? timeHorizon : defaultTimeHorizon,
        targetDate: formState.targetDate,
      });
      dispatch({ type: "reset" });
      onCreated?.();
      onOpenChange(false);
    } finally {
      dispatch({ type: "setSubmitting", isSubmitting: false });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Popover onOpenChange={onOpenChange} open={open}>
      <PopoverTrigger className={triggerClassName} type="button">
        <span className="leading-none">+</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <EmojiPicker
              onChange={(emoji) => dispatch({ type: "setEmoji", emoji })}
              value={formState.emoji}
            />
            <Input
              className="h-8 flex-1"
              onChange={(e) =>
                dispatch({ type: "setName", name: e.target.value })
              }
              onKeyDown={handleKeyDown}
              placeholder="Milestone name..."
              value={formState.name}
            />
          </div>

          <NotionColorPicker
            onChange={(color) => dispatch({ type: "setColor", color })}
            value={formState.color}
          />

          {showHorizonPicker && (
            <Select
              onValueChange={(val) => {
                if (val && isTimeHorizon(val)) {
                  dispatch({ type: "setTimeHorizon", timeHorizon: val });
                }
              }}
              value={timeHorizon}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_HORIZONS.map((h) => (
                  <SelectItem key={h} value={h}>
                    {TIME_HORIZON_CONFIG[h].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <MilestoneDatePicker
            onChange={(targetDate) =>
              dispatch({ type: "setTargetDate", targetDate })
            }
            value={formState.targetDate}
          />

          <div className="flex justify-end gap-2 pt-1">
            <Button
              className="h-7 text-xs"
              onClick={() => onOpenChange(false)}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              className="h-7 text-xs"
              disabled={formState.isSubmitting || !formState.name.trim()}
              onClick={handleSubmit}
              size="sm"
            >
              {formState.isSubmitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
