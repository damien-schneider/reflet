"use client";

import { IconLayersIntersect } from "@tabler/icons-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { TASK_GROUP_BY, type TaskGroupBy } from "./use-tasks-filters";

const GROUP_BY_LABELS: Record<TaskGroupBy, string> = {
  none: "No grouping",
  status: "Status",
  priority: "Priority",
  assignee: "Assignee",
  parent: "Parent",
  label: "Label",
  type: "Type",
};

export function GroupBySelect({
  value,
  onChange,
}: {
  value: TaskGroupBy;
  onChange: (value: TaskGroupBy) => void;
}) {
  return (
    <Select onValueChange={(v) => onChange(v as TaskGroupBy)} value={value}>
      <SelectTrigger className="h-8 w-36 gap-1.5">
        <IconLayersIntersect className="size-3.5 text-muted-foreground" />
        <SelectValue placeholder="Group by" />
      </SelectTrigger>
      <SelectContent>
        {TASK_GROUP_BY.map((option) => (
          <SelectItem key={option} value={option}>
            {GROUP_BY_LABELS[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
