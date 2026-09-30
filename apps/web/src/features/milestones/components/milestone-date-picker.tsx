"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Calendar } from "@ctrl-ui/react/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { CalendarBlank } from "@phosphor-icons/react";
import { format, startOfDay } from "date-fns";
import { useState } from "react";
import { getDeadlineColor, getDeadlineInfo } from "@/lib/milestone-deadline";
import { cn } from "@/lib/utils";

interface MilestoneDatePickerProps {
  milestoneStatus?: string;
  onChange: (date: number | undefined) => void;
  value: number | undefined;
}

export function MilestoneDatePicker({
  value,
  onChange,
  milestoneStatus,
}: MilestoneDatePickerProps) {
  const [open, setOpen] = useState(false);

  const selectedDate = value ? new Date(value) : undefined;
  const deadlineInfo = getDeadlineInfo(value, milestoneStatus ?? "active");
  const colorClass = deadlineInfo
    ? getDeadlineColor(deadlineInfo.status)
    : "text-muted-foreground";

  const handleSelect = (day: Date | undefined) => {
    if (day) {
      onChange(startOfDay(day).getTime());
      setOpen(false);
    }
  };

  const handleClear = () => {
    onChange(undefined);
    setOpen(false);
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            className={cn("tabular-nums", colorClass)}
            type="button"
            variant="surface"
          />
        }
      >
        <CalendarBlank aria-hidden />
        {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Set deadline"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          onSelect={handleSelect}
          selected={selectedDate}
        />
        {value !== undefined && (
          <div className="border-t p-2">
            <Button
              className="w-full"
              onClick={handleClear}
              size="xs"
              type="button"
              variant="ghost"
            >
              Clear deadline
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
