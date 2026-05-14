"use client";

import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";

export function ActivitySection({
  task,
  activity,
}: {
  task: Doc<"autopilotWorkItems">;
  activity: Doc<"autopilotActivityLog">[] | undefined;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
        Activity
      </h2>
      <ol className="space-y-3 text-sm">
        <ActivityRow message="Task created" timestamp={task.createdAt} />
        {(activity ?? [])
          .slice()
          .reverse()
          .map((entry) => (
            <ActivityRow
              key={entry._id}
              message={entry.message}
              timestamp={entry.createdAt}
            />
          ))}
      </ol>
    </section>
  );
}

function ActivityRow({
  message,
  timestamp,
}: {
  message: string;
  timestamp: number;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-muted-foreground/40" />
      <div className="min-w-0 flex-1">
        <p className="text-foreground">{message}</p>
        <p className="text-muted-foreground text-xs" suppressHydrationWarning>
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </p>
      </div>
    </li>
  );
}
