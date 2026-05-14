"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconCalendar,
  IconExternalLink,
  IconLink,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Muted } from "@/components/ui/typography";
import { InlineAssigneePopover } from "@/features/autopilot/components/tasks/inline-assignee-popover";
import { InlineLabelsPopover } from "@/features/autopilot/components/tasks/inline-labels-popover";
import { InlinePriorityPopover } from "@/features/autopilot/components/tasks/inline-priority-popover";
import { InlineStatusPopover } from "@/features/autopilot/components/tasks/inline-status-popover";

interface PropertiesSidebarProps {
  canCancel: boolean;
  labelIds: Id<"workItemLabels">[];
  onCancel: () => void;
  orgSlug: string;
  task: Doc<"autopilotWorkItems">;
}

export function PropertiesSidebar({
  task,
  labelIds,
  canCancel,
  onCancel,
  orgSlug,
}: PropertiesSidebarProps) {
  const dateMs = task.dueDate ?? task.targetDate;
  return (
    <aside className="space-y-3 border-l bg-background/40 p-3 lg:p-4">
      <SidebarBlock title="Properties">
        <SidebarRow icon={null} label="Status">
          <InlineStatusPopover status={task.status} workItemId={task._id} />
        </SidebarRow>
        <SidebarRow icon={null} label="Priority">
          <InlinePriorityPopover
            priority={task.priority}
            workItemId={task._id}
          />
        </SidebarRow>
        <SidebarRow icon={<IconUser className="size-3.5" />} label="Assignee">
          <InlineAssigneePopover
            assignedAgent={task.assignedAgent}
            assigneeUserId={task.assigneeUserId}
            organizationId={task.organizationId}
            workItemId={task._id}
          />
        </SidebarRow>
        {dateMs ? (
          <SidebarRow icon={<IconCalendar className="size-3.5" />} label="Date">
            <span className="text-foreground">
              {format(dateMs, "MMM d, yyyy")}
            </span>
          </SidebarRow>
        ) : null}
      </SidebarBlock>

      <SidebarBlock title="Labels">
        <div className="-ml-1">
          <InlineLabelsPopover
            labelIds={labelIds}
            organizationId={task.organizationId}
            workItemId={task._id}
          />
        </div>
      </SidebarBlock>

      {task.parentId ? (
        <SidebarBlock title="Project">
          <ParentLink orgSlug={orgSlug} parentId={task.parentId} />
        </SidebarBlock>
      ) : null}

      {task.prUrl ? (
        <SidebarBlock title="Relations">
          <a
            className="inline-flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-sm transition-colors hover:bg-muted"
            href={task.prUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <IconExternalLink className="size-3.5" />
            Pull Request {task.prNumber ? `#${task.prNumber}` : ""}
          </a>
        </SidebarBlock>
      ) : null}

      {canCancel ? (
        <Button
          className="w-full"
          onClick={onCancel}
          size="sm"
          variant="outline"
        >
          <IconX className="size-4" />
          Cancel task
        </Button>
      ) : null}
    </aside>
  );
}

function SidebarBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border bg-card/65 p-4">
      <h3 className="font-medium text-muted-foreground text-sm">{title}</h3>
      <div className="space-y-3 text-sm">{children}</div>
    </section>
  );
}

function SidebarRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3">
      <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground text-xs">
        {icon}
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function ParentLink({
  orgSlug,
  parentId,
}: {
  orgSlug: string;
  parentId: Id<"autopilotWorkItems">;
}) {
  const parent = useQuery(api.autopilot.queries.work.getWorkItem, {
    workItemId: parentId,
  });
  if (!parent) {
    return <Muted className="text-xs">Loading...</Muted>;
  }
  return (
    <Link
      className="inline-flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-sm transition-colors hover:bg-muted"
      href={`/dashboard/${orgSlug}/tasks/${parent._id}`}
      prefetch
    >
      <IconLink className="size-3.5 text-muted-foreground" />
      {parent.identifier ? (
        <span className="font-mono text-muted-foreground text-xs">
          {parent.identifier}
        </span>
      ) : null}
      <span className="line-clamp-1">{parent.title}</span>
    </Link>
  );
}
