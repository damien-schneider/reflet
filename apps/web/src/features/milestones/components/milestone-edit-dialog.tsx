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
import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  isTagColor,
  type TagColor,
} from "@reflet/backend/convex/feedback/tag_colors";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { NotionColorPicker } from "@/components/ui/notion-color-picker";
import type { TimeHorizon } from "@/lib/milestone-constants";
import {
  isTimeHorizon,
  TIME_HORIZON_CONFIG,
  TIME_HORIZONS,
} from "@/lib/milestone-constants";

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

interface MilestoneDraft {
  color: TagColor;
  emoji: string | undefined;
  horizon: TimeHorizon;
  name: string;
  targetDate: number | undefined;
}

function useMilestoneDraft(milestone: EditableMilestone) {
  const [edits, setEdits] = useState<Partial<MilestoneDraft>>({});
  const draft: MilestoneDraft = {
    color:
      edits.color ??
      (isTagColor(milestone.color) ? milestone.color : "default"),
    emoji: "emoji" in edits ? edits.emoji : milestone.emoji,
    horizon: edits.horizon ?? milestone.timeHorizon,
    name: edits.name ?? milestone.name,
    targetDate: "targetDate" in edits ? edits.targetDate : milestone.targetDate,
  };
  const edit = (patch: Partial<MilestoneDraft>) =>
    setEdits((prev) => ({ ...prev, ...patch }));
  return { draft, edit };
}

function MilestoneEditForm({
  milestone,
  onDone,
}: {
  milestone: EditableMilestone;
  onDone: () => void;
}) {
  const updateMilestone = useMutation(api.organizations.milestones.update);
  const { draft, edit } = useMilestoneDraft(milestone);
  const { name, emoji, color, horizon, targetDate } = draft;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    const dateCleared =
      milestone.targetDate !== undefined && targetDate === undefined;
    let dateUpdate: { clearTargetDate?: true; targetDate?: number } = {};
    if (dateCleared) {
      dateUpdate = { clearTargetDate: true };
    } else if (targetDate !== undefined) {
      dateUpdate = { targetDate };
    }

    setIsSubmitting(true);
    try {
      await updateMilestone({
        color,
        emoji,
        id: milestone._id,
        name: trimmedName,
        timeHorizon: horizon,
        ...dateUpdate,
      });
      onDone();
    } catch {
      toast.error("Couldn’t save the milestone. Try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <form className="contents" onSubmit={handleSubmit}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <EmojiPicker
            onChange={(value) => edit({ emoji: value })}
            value={emoji}
          />
          <Input
            aria-label="Milestone name"
            autoComplete="off"
            autoFocus
            className="flex-1"
            onChange={(e) => edit({ name: e.target.value })}
            placeholder="Milestone name…"
            value={name}
          />
        </div>

        <NotionColorPicker
          onChange={(value) => edit({ color: value })}
          value={color}
        />

        <Select
          onValueChange={(val) => {
            if (val && isTimeHorizon(val)) {
              edit({ horizon: val });
            }
          }}
          value={horizon}
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

        <MilestoneDatePicker
          milestoneStatus={milestone.status}
          onChange={(value) => edit({ targetDate: value })}
          value={targetDate}
        />
      </div>
      <DialogFooter>
        <Button onClick={onDone} type="button" variant="ghost">
          Cancel
        </Button>
        <Button
          disabled={isSubmitting || !name.trim()}
          tone="primary"
          type="submit"
          variant="solid"
        >
          {isSubmitting ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function MilestoneEditDialog({
  milestone,
  open,
  onOpenChange,
}: MilestoneEditDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Edit milestone</DialogTitle>
        </DialogHeader>
        <MilestoneEditForm
          key={String(open)}
          milestone={milestone}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
