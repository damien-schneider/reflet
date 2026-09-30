"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import { toast } from "@ctrl-ui/react/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { Plus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { NotionColorPicker } from "@/components/ui/notion-color-picker";
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

export function MilestoneFormPopover({
  organizationId,
  defaultTimeHorizon,
  showHorizonPicker = false,
  open,
  onOpenChange,
  onCreated,
  triggerClassName,
}: MilestoneFormPopoverProps) {
  const createMilestone = useMutation(api.organizations.milestones.create);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string | undefined>();
  const [color, setColor] = useState<TagColor>("blue");
  const [timeHorizon, setTimeHorizon] =
    useState<TimeHorizon>(defaultTimeHorizon);
  const [targetDate, setTargetDate] = useState<number | undefined>();

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createMilestone({
        color,
        emoji,
        name: trimmedName,
        organizationId,
        targetDate,
        timeHorizon: showHorizonPicker ? timeHorizon : defaultTimeHorizon,
      });
      setName("");
      setEmoji(undefined);
      setColor("blue");
      setTimeHorizon(defaultTimeHorizon);
      setTargetDate(undefined);
      onCreated?.();
      onOpenChange(false);
    } catch {
      toast.error("Couldn’t create the milestone. Try again.");
    }
    setIsSubmitting(false);
  };

  const horizonLabel = TIME_HORIZON_CONFIG[defaultTimeHorizon].label;
  const addLabel = `Add milestone to ${horizonLabel}`;

  return (
    <Popover onOpenChange={onOpenChange} open={open}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              aria-label={addLabel}
              className={triggerClassName}
              type="button"
            >
              <Plus aria-hidden className="size-3.5" />
            </PopoverTrigger>
          }
        />
        <TooltipContent>{addLabel}</TooltipContent>
      </Tooltip>
      <PopoverContent align="start" className="w-[280px] p-3">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <div className="flex items-center gap-2">
            <EmojiPicker onChange={setEmoji} value={emoji} />
            <Input
              aria-label="Milestone name"
              autoComplete="off"
              autoFocus
              className="flex-1"
              onChange={(e) => setName(e.target.value)}
              placeholder="Milestone name…"
              value={name}
            />
          </div>

          <NotionColorPicker onChange={(c) => setColor(c)} value={color} />

          {showHorizonPicker && (
            <Select
              onValueChange={(val) => {
                if (val && isTimeHorizon(val)) {
                  setTimeHorizon(val);
                }
              }}
              value={timeHorizon}
            >
              <SelectTrigger aria-label="Time horizon">
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

          <MilestoneDatePicker onChange={setTargetDate} value={targetDate} />

          <div className="flex justify-end gap-2 pt-1">
            <Button
              onClick={() => onOpenChange(false)}
              size="xs"
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={isSubmitting || !name.trim()}
              size="xs"
              tone="primary"
              type="submit"
              variant="solid"
            >
              {isSubmitting ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
