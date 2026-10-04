"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Calendar } from "@ctrl-ui/react/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { CalendarBlank } from "@phosphor-icons/react";
import { endOfDay, format, startOfDay } from "date-fns";
import { useId, useState } from "react";

interface ScheduleDateFieldProps {
  /** Starts count from the beginning of the chosen day, ends run to its last millisecond. */
  edge: "start" | "end";
  error?: string;
  label: string;
  onChange: (value: number | null) => void;
  value: number | null;
}

export function ScheduleDateField({
  edge,
  error,
  label,
  onChange,
  value,
}: ScheduleDateFieldProps) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const triggerId = useId();
  const errorId = useId();
  const selectedDate = value === null ? undefined : new Date(value);

  const handleSelect = (day: Date | undefined) => {
    if (!day) {
      return;
    }
    onChange((edge === "start" ? startOfDay(day) : endOfDay(day)).getTime());
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-sm" id={labelId}>
        {label}
      </span>
      <div className="flex items-center gap-1">
        <Popover onOpenChange={setOpen} open={open}>
          <PopoverTrigger
            render={
              <Button
                aria-describedby={error ? errorId : undefined}
                aria-invalid={Boolean(error)}
                aria-labelledby={`${labelId} ${triggerId}`}
                className="min-w-40 justify-start tabular-nums"
                id={triggerId}
                type="button"
                variant="surface"
              />
            }
          >
            <CalendarBlank aria-hidden />
            {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Not set"}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto" padding="none">
            <Calendar
              mode="single"
              onSelect={handleSelect}
              selected={selectedDate}
            />
          </PopoverContent>
        </Popover>
        {value === null ? null : (
          <Button
            onClick={() => onChange(null)}
            size="sm"
            type="button"
            variant="ghost"
          >
            Clear<span className="sr-only"> {label.toLowerCase()}</span>
          </Button>
        )}
      </div>
      {error ? (
        <p className="text-destructive-text text-xs" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
