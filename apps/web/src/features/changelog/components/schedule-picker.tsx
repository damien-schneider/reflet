"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Button } from "@ctrl-ui/react/ui/button";
import { Calendar } from "@ctrl-ui/react/ui/calendar";
import { Input } from "@ctrl-ui/react/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { CalendarBlank, Globe } from "@phosphor-icons/react";
import { format } from "date-fns";
import { useState } from "react";

interface SchedulePickerProps {
  disabled?: boolean;
  onChange: (date: Date | undefined) => void;
  value: Date | undefined;
}

const TIMEZONE_PREVIEWS = [
  { city: "New York", timeZone: "America/New_York" },
  { city: "London", timeZone: "Europe/London" },
  { city: "Paris", timeZone: "Europe/Paris" },
  { city: "Tokyo", timeZone: "Asia/Tokyo" },
] as const;

function formatTimeInTimezone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(date);
}

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

export function SchedulePicker({
  value,
  onChange,
  disabled,
}: SchedulePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() =>
    value ? new Date(value) : undefined
  );
  const [timeValue, setTimeValue] = useState(
    value ? format(value, "HH:mm") : "09:00"
  );
  const [checkedAt, setCheckedAt] = useState(() => Date.now());

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setCheckedAt(Date.now());
    onChange(date ? combineDateAndTime(date, timeValue) : undefined);
  };

  const handleTimeChange = (newTime: string) => {
    setTimeValue(newTime);
    setCheckedAt(Date.now());
    if (selectedDate) {
      onChange(combineDateAndTime(selectedDate, newTime));
    }
  };

  const combinedDate =
    selectedDate && timeValue
      ? combineDateAndTime(selectedDate, timeValue)
      : undefined;

  const isInPast = combinedDate ? combinedDate.getTime() <= checkedAt : false;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger
            render={
              <Button
                className={cn(
                  "min-w-0 flex-1 justify-start tabular-nums",
                  !selectedDate && "text-muted-foreground"
                )}
                disabled={disabled}
                size="sm"
                variant="surface"
              >
                <CalendarBlank aria-hidden="true" className="size-4" />
                {selectedDate
                  ? format(selectedDate, "MMM d, yyyy")
                  : "Pick date"}
              </Button>
            }
          />
          <PopoverContent align="start" className="w-auto" padding="none">
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

        <Input
          aria-label="Publish time"
          className="w-32 tabular-nums"
          disabled={disabled}
          onChange={(e) => handleTimeChange(e.target.value)}
          size="sm"
          type="time"
          value={timeValue}
        />
      </div>

      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Globe aria-hidden="true" className="size-3.5" />
        <span>Your time zone: {userTimezone}</span>
      </div>

      {combinedDate && !isInPast && (
        <div className="rounded-md border bg-muted/30 px-3 py-2">
          <p className="mb-1.5 text-muted-foreground text-xs">
            Same moment elsewhere
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {TIMEZONE_PREVIEWS.map((tz) => (
              <div className="flex justify-between gap-2" key={tz.timeZone}>
                <dt className="text-muted-foreground">{tz.city}</dt>
                <dd className="tabular-nums">
                  {formatTimeInTimezone(combinedDate, tz.timeZone)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {isInPast && (
        <p className="text-destructive-text text-xs" role="status">
          Pick a time in the future.
        </p>
      )}
    </div>
  );
}
