"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Calendar } from "@ctrl-ui/react/ui/calendar";
import { Input } from "@ctrl-ui/react/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { CalendarBlank, Clock, Globe } from "@phosphor-icons/react";
import { format } from "date-fns";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface SchedulePickerProps {
  disabled?: boolean;
  onChange: (date: Date | undefined) => void;
  value: Date | undefined;
}

const TIMEZONE_PREVIEWS = [
  { label: "EST", offset: -5 },
  { label: "GMT", offset: 0 },
  { label: "CET", offset: 1 },
  { label: "JST", offset: 9 },
] as const;

function formatTimeInTimezone(date: Date, offsetHours: number): string {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60_000;
  const targetDate = new Date(utcMs + offsetHours * 3_600_000);
  return format(targetDate, "h:mm a");
}

export function SchedulePicker({
  value,
  onChange,
  disabled,
}: SchedulePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    value ? new Date(value) : undefined
  );
  const [timeValue, setTimeValue] = useState(
    value ? format(value, "HH:mm") : "09:00"
  );

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const [hours, minutes] = timeValue.split(":").map(Number);
      const combined = new Date(date);
      combined.setHours(hours, minutes, 0, 0);
      onChange(combined);
    } else {
      onChange(undefined);
    }
  };

  const handleTimeChange = (newTime: string) => {
    setTimeValue(newTime);
    if (selectedDate) {
      const [hours, minutes] = newTime.split(":").map(Number);
      const combined = new Date(selectedDate);
      combined.setHours(hours, minutes, 0, 0);
      onChange(combined);
    }
  };

  const combinedDate =
    selectedDate && timeValue
      ? (() => {
          const [hours, minutes] = timeValue.split(":").map(Number);
          const d = new Date(selectedDate);
          d.setHours(hours, minutes, 0, 0);
          return d;
        })()
      : undefined;

  const isInPast = combinedDate ? combinedDate.getTime() <= Date.now() : false;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger
            render={
              <Button
                className={cn(
                  "w-full justify-start font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
                disabled={disabled}
                size="sm"
                variant="surface"
              >
                <CalendarBlank className="mr-2 h-4 w-4" />
                {selectedDate
                  ? format(selectedDate, "MMM d, yyyy")
                  : "Pick date"}
              </Button>
            }
          />
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              disabled={(date) =>
                date < new Date(new Date().setHours(0, 0, 0, 0))
              }
              mode="single"
              onSelect={handleDateSelect}
              selected={selectedDate}
            />
          </PopoverContent>
        </Popover>

        <div className="relative">
          <Clock className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Publish time"
            className="w-28 pl-8 tabular-nums"
            disabled={disabled}
            onChange={(e) => handleTimeChange(e.target.value)}
            type="time"
            value={timeValue}
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Globe className="h-3.5 w-3.5" />
        <span>{userTimezone}</span>
      </div>

      {combinedDate && !isInPast && (
        <div className="rounded-md border bg-muted/30 px-3 py-2">
          <Label className="mb-1.5 block text-muted-foreground text-xs">
            Preview in other timezones
          </Label>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {TIMEZONE_PREVIEWS.map((tz) => (
              <span className="tabular-nums" key={tz.label}>
                <span className="font-medium">{tz.label}:</span>{" "}
                {formatTimeInTimezone(combinedDate, tz.offset)}
              </span>
            ))}
          </div>
        </div>
      )}

      {isInPast && (
        <p className="text-destructive-text text-xs">
          Scheduled time must be in the future
        </p>
      )}
    </div>
  );
}
