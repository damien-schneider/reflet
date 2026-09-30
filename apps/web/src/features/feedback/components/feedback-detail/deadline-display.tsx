"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Calendar } from "@ctrl-ui/react/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { CalendarCheck, X } from "@phosphor-icons/react";
import { format, isPast, isToday } from "date-fns";
import { TagBadge } from "@/components/tag-badge";

export function DeadlineDisplay({
  deadline,
  isOpen,
  onOpenChange,
  onChange,
  onClear,
}: {
  deadline?: number | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (date: Date) => void;
  onClear: () => void;
}) {
  const hasDeadline = deadline && deadline > 0;
  const deadlineDate = hasDeadline ? new Date(deadline) : null;
  const isOverdue = deadlineDate
    ? isPast(deadlineDate) && !isToday(deadlineDate)
    : false;

  return (
    <Popover onOpenChange={onOpenChange} open={isOpen}>
      {hasDeadline && deadlineDate ? (
        <PopoverTrigger
          aria-label={`Deadline ${format(deadlineDate, "MMMM d")}${isOverdue ? ", overdue" : ""}. Change deadline`}
          className="select-none"
          render={
            <TagBadge
              color={isOverdue ? "red" : "purple"}
              render={<button type="button" />}
            />
          }
        >
          <CalendarCheck aria-hidden />
          <span>{format(deadlineDate, "MMM d")}</span>
        </PopoverTrigger>
      ) : (
        <PopoverTrigger
          aria-label="Set deadline"
          className="select-none"
          render={
            <TagBadge render={<button type="button" />} variant="outline" />
          }
        >
          <CalendarCheck aria-hidden />
          <span>Deadline</span>
        </PopoverTrigger>
      )}
      <PopoverContent align="start" className="w-auto p-2" sideOffset={4}>
        <Calendar
          mode="single"
          onSelect={(date) => {
            if (date) {
              onChange(date);
            }
          }}
          selected={deadlineDate ?? undefined}
        />
        {hasDeadline && (
          <Button
            className="mt-2 h-auto w-full gap-1 border-t pt-2 text-xs"
            onClick={onClear}
            size="xs"
            variant="quiet"
          >
            <X className="h-3 w-3" />
            Clear deadline
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
