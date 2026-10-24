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
import {
  getDeadlineButtonClass,
  getDeadlineInfo,
} from "@/lib/milestone-deadline";

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
  const deadlineClass = getDeadlineButtonClass(deadlineInfo?.status ?? "none");

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
          <Button className={deadlineClass} type="button" variant="surface" />
        }
      >
        <CalendarBlank aria-hidden />
        {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Set deadline"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto" padding="none">
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
