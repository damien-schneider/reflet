import type { Doc } from "@reflet/backend/convex/_generated/dataModel";

import { IssueRow } from "@/features/autopilot/components/issue-row";
import {
  PRIORITY_ORDER,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_ORDER,
} from "@/features/autopilot/components/views/initiatives-board-constants";
import { cn } from "@/lib/utils";

export function GroupedList({
  items,
  groupKey,
}: {
  items: Doc<"autopilotWorkItems">[];
  groupKey: "status" | "priority";
}) {
  const groups = groupKey === "status" ? STATUS_ORDER : PRIORITY_ORDER;

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const filtered = items.filter((i) =>
          groupKey === "status" ? i.status === group : i.priority === group
        );
        if (filtered.length === 0) {
          return null;
        }

        return (
          <div key={group}>
            <div className="mb-2 flex items-center gap-2">
              <span
                className={cn(
                  "size-2 rounded-full",
                  groupKey === "status"
                    ? (STATUS_COLORS[group] ?? "bg-muted-foreground")
                    : "bg-muted-foreground"
                )}
              />
              <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                {groupKey === "status"
                  ? (STATUS_LABELS[group] ?? group)
                  : group}
              </span>
              <span className="text-muted-foreground text-xs">
                {filtered.length}
              </span>
            </div>
            <div>
              {filtered.map((initiative) => (
                <IssueRow
                  completionPercent={initiative.completionPercent}
                  key={initiative._id}
                  priority={initiative.priority}
                  status={initiative.status}
                  title={initiative.title}
                  updatedAt={initiative.updatedAt}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
