"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";

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
  organizationId: Id<"organizations">;
  defaultTimeHorizon: TimeHorizon;
  /** When true, show a time horizon selector in the form */
  showHorizonPicker?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
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
  const createMilestone = useMutation(api.milestones.create);

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
        organizationId,
        name: trimmedName,
        emoji,
        color,
        timeHorizon: showHorizonPicker ? timeHorizon : defaultTimeHorizon,
        targetDate,
      });
      setName("");
      setEmoji(undefined);
      setColor("blue");
      setTimeHorizon(defaultTimeHorizon);
      setTargetDate(undefined);
      onCreated?.();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
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
            <EmojiPicker onChange={setEmoji} value={emoji} />
            <Input
              autoFocus
              className="h-8 flex-1"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Milestone name..."
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

          <MilestoneDatePicker onChange={setTargetDate} value={targetDate} />

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
              disabled={isSubmitting || !name.trim()}
              onClick={handleSubmit}
              size="sm"
            >
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
