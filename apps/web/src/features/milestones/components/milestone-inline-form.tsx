"use client";

import { Check, X } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TimeHorizon } from "@/lib/milestone-constants";
import { TIME_HORIZON_CONFIG, TIME_HORIZONS } from "@/lib/milestone-constants";
import {
  getTagColorValues,
  TAG_COLOR_LABELS,
  TAG_COLORS,
} from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

import { MilestoneDatePicker } from "./milestone-date-picker";

interface MilestoneInlineFormProps {
  organizationId: Id<"organizations">;
  defaultTimeHorizon: TimeHorizon;
  onCancel: () => void;
  onCreated?: () => void;
}

export function MilestoneInlineForm({
  organizationId,
  defaultTimeHorizon,
  onCancel,
  onCreated,
}: MilestoneInlineFormProps) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string | undefined>();
  const [color, setColor] = useState("blue");
  const [timeHorizon, setTimeHorizon] =
    useState<TimeHorizon>(defaultTimeHorizon);
  const [targetDate, setTargetDate] = useState<number | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);

  const createMilestone = useMutation(api.milestones.create);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      onCancel();
      return;
    }

    await createMilestone({
      organizationId,
      name: trimmedName,
      emoji,
      color,
      timeHorizon,
      targetDate,
    });

    onCreated?.();
  }, [
    name,
    emoji,
    color,
    timeHorizon,
    targetDate,
    organizationId,
    createMilestone,
    onCancel,
    onCreated,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        onCancel();
      }
    },
    [handleSave, onCancel]
  );

  const colorValues = getTagColorValues(color);

  return (
    <div className="w-56 rounded-lg border bg-card p-3 shadow-sm">
      {/* Top color border */}
      <div
        className="-mx-3 -mt-3 mb-3 h-[3px] rounded-t-lg"
        style={{
          background: `linear-gradient(to right, ${colorValues.text}, ${colorValues.text}00)`,
        }}
      />

      <div className="space-y-2">
        {/* Emoji + Name */}
        <div className="flex items-center gap-2">
          <EmojiPicker onChange={setEmoji} value={emoji} />
          <Input
            className="h-8 flex-1 text-sm"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Milestone name..."
            ref={inputRef}
            value={name}
          />
        </div>

        {/* Color picker */}
        <div className="flex flex-wrap gap-1">
          {TAG_COLORS.filter((c) => c !== "default").map((c) => {
            const cv = getTagColorValues(c);
            return (
              <button
                className={cn(
                  "h-5 w-5 rounded-full transition-transform hover:scale-110",
                  c === color && "ring-2 ring-primary ring-offset-1"
                )}
                key={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: cv.text }}
                title={TAG_COLOR_LABELS[c]}
                type="button"
              />
            );
          })}
        </div>

        {/* Time horizon select */}
        <Select
          onValueChange={(val) => setTimeHorizon(val as TimeHorizon)}
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

        {/* Deadline */}
        <MilestoneDatePicker onChange={setTargetDate} value={targetDate} />

        {/* Actions */}
        <div className="flex justify-end gap-1">
          <Button
            className="h-7 w-7"
            onClick={handleSave}
            size="icon"
            variant="ghost"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            className="h-7 w-7"
            onClick={onCancel}
            size="icon"
            variant="ghost"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
