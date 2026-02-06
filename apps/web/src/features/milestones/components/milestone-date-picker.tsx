"use client";

import { CalendarBlank } from "@phosphor-icons/react";
import { format, startOfDay } from "date-fns";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getDeadlineColor, getDeadlineInfo } from "@/lib/milestone-deadline";
import { cn } from "@/lib/utils";

interface MilestoneDatePickerProps {
  value: number | undefined;
  onChange: (date: number | undefined) => void;
  milestoneStatus?: string;
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
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors hover:bg-accent",
          colorClass
        )}
      >
        <CalendarBlank className="h-3.5 w-3.5" />
        {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Set deadline"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          onSelect={handleSelect}
          selected={selectedDate}
        />
        {value !== undefined && (
          <div className="border-t px-3 py-2">
            <Button
              className="h-6 w-full text-xs"
              onClick={handleClear}
              size="sm"
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
