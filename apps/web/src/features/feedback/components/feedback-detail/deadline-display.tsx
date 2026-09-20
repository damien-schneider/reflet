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
import { cn } from "@/lib/utils";

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
          aria-label="Change deadline"
          render={<Button className="h-auto select-none p-0" variant="quiet" />}
        >
          <TagBadge
            className={cn(
              "h-8 gap-1 rounded-full px-3 font-normal text-xs",
              isOverdue &&
                "border-destructive/30 bg-destructive/10 text-destructive"
            )}
            color={isOverdue ? "red" : "purple"}
          >
            <CalendarCheck className="h-3 w-3" />
            <span>{format(deadlineDate, "MMM d")}</span>
          </TagBadge>
        </PopoverTrigger>
      ) : (
        <PopoverTrigger
          aria-label="Change deadline"
          render={
            <Button
              className="h-8 select-none gap-1.5 rounded-full border border-input border-dashed px-3 text-xs transition-colors"
              variant="quiet"
            />
          }
        >
          <CalendarCheck className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">Deadline</span>
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
