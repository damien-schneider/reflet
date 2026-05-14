"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconArchive,
  IconFlag,
  IconRobot,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  TASK_AGENTS,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "./use-tasks-filters";

const STATUS_LABELS: Record<string, string> = {
  triage: "Triage",
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  cancelled: "Cancelled",
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const AGENT_LABELS: Record<string, string> = {
  ceo: "CEO",
  pm: "PM",
  cto: "CTO",
  growth: "Growth",
  orchestrator: "Orchestrator",
  sales: "Sales",
  support: "Support",
  system: "System",
  validator: "Validator",
};

interface BulkActionsBarProps {
  isAdmin: boolean;
  members?: Array<{
    email: string | null;
    name: string | null;
    userId: string;
  }>;
  onClear: () => void;
  organizationId: Id<"organizations">;
  selectedIds: Id<"autopilotWorkItems">[];
}

type BulkPatch = Parameters<
  ReturnType<
    typeof useMutation<typeof api.autopilot.mutations.work.bulkUpdateWorkItems>
  >
>[0];

export function BulkActionsBar({
  organizationId,
  selectedIds,
  onClear,
  isAdmin,
  members,
}: BulkActionsBarProps) {
  const bulkUpdate = useMutation(
    api.autopilot.mutations.work.bulkUpdateWorkItems
  );
  const [isPending, setIsPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (selectedIds.length === 0) {
    return null;
  }

  const runBulk = async (
    patch: Omit<BulkPatch, "organizationId" | "workItemIds">,
    successLabel: string
  ) => {
    setIsPending(true);
    try {
      const result = await bulkUpdate({
        organizationId,
        workItemIds: selectedIds,
        ...patch,
      });
      toast.success(`${successLabel} (${result.updated})`);
      onClear();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Bulk update failed";
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div
      aria-label="Bulk actions"
      className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border bg-background/95 px-3 py-2 shadow-lg backdrop-blur"
      role="toolbar"
    >
      <span className="px-2 font-medium text-sm">
        {selectedIds.length} selected
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button disabled={isPending} size="sm" variant="ghost">
              Status
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Set status</DropdownMenuLabel>
            {TASK_STATUSES.map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() =>
                  runBulk(
                    { status },
                    `Updated status to ${STATUS_LABELS[status] ?? status}`
                  )
                }
              >
                {STATUS_LABELS[status] ?? status}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              className="gap-1.5"
              disabled={isPending}
              size="sm"
              variant="ghost"
            >
              <IconFlag className="size-3.5" />
              Priority
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Set priority</DropdownMenuLabel>
            {TASK_PRIORITIES.map((priority) => (
              <DropdownMenuItem
                key={priority}
                onClick={() =>
                  runBulk(
                    { priority },
                    `Updated priority to ${PRIORITY_LABELS[priority] ?? priority}`
                  )
                }
              >
                {PRIORITY_LABELS[priority] ?? priority}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              className="gap-1.5"
              disabled={isPending}
              size="sm"
              variant="ghost"
            >
              <IconRobot className="size-3.5" />
              Agent
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Assign agent</DropdownMenuLabel>
            {TASK_AGENTS.map((agent) => (
              <DropdownMenuItem
                key={agent}
                onClick={() =>
                  runBulk(
                    { assignedAgent: agent },
                    `Assigned to ${AGENT_LABELS[agent] ?? agent}`
                  )
                }
              >
                {AGENT_LABELS[agent] ?? agent}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {members && members.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                className="gap-1.5"
                disabled={isPending}
                size="sm"
                variant="ghost"
              >
                <IconUser className="size-3.5" />
                Assignee
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Assign teammate</DropdownMenuLabel>
              {members.map((member) => (
                <DropdownMenuItem
                  key={member.userId}
                  onClick={() =>
                    runBulk(
                      { assigneeUserId: member.userId },
                      `Assigned to ${member.name ?? member.email ?? "member"}`
                    )
                  }
                >
                  {member.name ?? member.email ?? member.userId}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Button
        className="gap-1.5"
        disabled={isPending}
        onClick={() =>
          runBulk({ status: "cancelled" }, "Archived selected tasks")
        }
        size="sm"
        variant="ghost"
      >
        <IconArchive className="size-3.5" />
        Archive
      </Button>

      {isAdmin && (
        <Button
          className="gap-1.5 text-destructive hover:text-destructive"
          disabled={isPending}
          onClick={() => setConfirmDelete(true)}
          size="sm"
          variant="ghost"
        >
          <IconTrash className="size-3.5" />
          Delete
        </Button>
      )}

      <Button
        aria-label="Clear selection"
        className="ml-1 size-7"
        onClick={onClear}
        size="icon-sm"
        variant="ghost"
      >
        <IconX className="size-4" />
      </Button>

      <AlertDialog onOpenChange={setConfirmDelete} open={confirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIds.length}{" "}
              {selectedIds.length === 1 ? "task" : "tasks"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently archive the selected tasks (set status to
              cancelled). The action cannot be undone via this UI.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await runBulk(
                  { status: "cancelled" },
                  "Tasks moved to cancelled"
                );
                setConfirmDelete(false);
              }}
              variant="destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
