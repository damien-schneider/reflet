"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ctrl-ui/react/ui/dialog";
import { Input } from "@ctrl-ui/react/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { NotionColorPicker } from "@/components/ui/notion-color-picker";
import type { TimeHorizon } from "@/lib/milestone-constants";
import {
  isTimeHorizon,
  TIME_HORIZON_CONFIG,
  TIME_HORIZONS,
} from "@/lib/milestone-constants";
import type { TagColor } from "@/lib/tag-colors";
import { isValidTagColor } from "@/lib/tag-colors";

import { MilestoneDatePicker } from "./milestone-date-picker";

export interface EditableMilestone {
  _id: Id<"milestones">;
  color: string;
  emoji?: string;
  name: string;
  status: string;
  targetDate?: number;
  timeHorizon: TimeHorizon;
}

interface MilestoneEditDialogProps {
  milestone: EditableMilestone;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function MilestoneEditDialog({
  milestone,
  open,
  onOpenChange,
}: MilestoneEditDialogProps) {
  const updateMilestone = useMutation(api.organizations.milestones.update);

  const [name, setName] = useState(milestone.name);
  const [emoji, setEmoji] = useState(milestone.emoji);
  const [color, setColor] = useState<TagColor>(
    isValidTagColor(milestone.color) ? milestone.color : "default"
  );
  const [horizon, setHorizon] = useState<TimeHorizon>(milestone.timeHorizon);
  const [targetDate, setTargetDate] = useState(milestone.targetDate);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(milestone.name);
    setEmoji(milestone.emoji);
    setColor(isValidTagColor(milestone.color) ? milestone.color : "default");
    setHorizon(milestone.timeHorizon);
    setTargetDate(milestone.targetDate);
  }, [
    open,
    milestone.name,
    milestone.emoji,
    milestone.color,
    milestone.timeHorizon,
    milestone.targetDate,
  ]);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    setIsSubmitting(true);
    try {
      const dateCleared =
        milestone.targetDate !== undefined && targetDate === undefined;
      let dateUpdate: { clearTargetDate?: true; targetDate?: number } = {};
      if (dateCleared) {
        dateUpdate = { clearTargetDate: true };
      } else if (targetDate !== undefined) {
        dateUpdate = { targetDate };
      }
      await updateMilestone({
        color,
        emoji,
        id: milestone._id,
        name: trimmedName,
        timeHorizon: horizon,
        ...dateUpdate,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Edit Milestone</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <EmojiPicker onChange={setEmoji} value={emoji} />
            <Input
              autoFocus
              className="h-8 flex-1"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Milestone name..."
              value={name}
            />
          </div>

          <NotionColorPicker onChange={setColor} value={color} />

          <Select
            onValueChange={(val) => {
              if (val && isTimeHorizon(val)) {
                setHorizon(val);
              }
            }}
            value={horizon}
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

          <MilestoneDatePicker
            milestoneStatus={milestone.status}
            onChange={setTargetDate}
            value={targetDate}
          />
        </div>
        <DialogFooter>
          <Button
            className="h-8 text-xs"
            onClick={() => onOpenChange(false)}
            size="xs"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            className="h-8 text-xs"
            disabled={isSubmitting || !name.trim()}
            onClick={handleSubmit}
            size="xs"
            tone="primary"
            variant="solid"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
