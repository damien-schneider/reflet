"use client";

import { CalendarCheck, X } from "@phosphor-icons/react";
import { format, isPast, isToday } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
          className="flex cursor-pointer select-none items-center"
          render={<button type="button" />}
        >
          <Badge
            className={cn(
              "h-8 gap-1 rounded-full px-3 font-normal text-xs",
              isOverdue &&
                "border-destructive/30 bg-destructive/10 text-destructive"
            )}
            color={isOverdue ? "red" : "violet"}
          >
            <CalendarCheck className="h-3 w-3" />
            <span>{format(deadlineDate, "MMM d")}</span>
          </Badge>
        </PopoverTrigger>
      ) : (
        <PopoverTrigger
          className="flex h-8 cursor-pointer select-none items-center gap-1.5 rounded-full border border-input border-dashed bg-transparent px-3 text-xs transition-colors"
          render={<button type="button" />}
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
          <button
            className="flex w-full items-center justify-center gap-1 border-t pt-2 text-muted-foreground text-xs hover:text-foreground"
            onClick={onClear}
            type="button"
          >
            <X className="h-3 w-3" />
            Clear deadline
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
