"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { IconChecklist, IconLayoutKanban, IconPlus } from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { H2 } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { TaskCard } from "@/features/autopilot/components/task-card";
import { InitiativesBoard } from "@/features/autopilot/components/views/initiatives-board";
import { cn } from "@/lib/utils";

const ROADMAP_TABS = [
  { id: "initiatives", label: "Initiatives", icon: IconLayoutKanban },
  { id: "tasks", label: "Active Tasks", icon: IconChecklist },
] as const;

type StatusFilter =
  | "all"
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "cancelled";

const STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Backlog", value: "backlog" },
  { label: "To Do", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "In Review", value: "in_review" },
  { label: "Done", value: "done" },
  { label: "Cancelled", value: "cancelled" },
] as const;

function ActiveTasksTab() {
  const { isAdmin, organizationId } = useAutopilotContext();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<
    "critical" | "high" | "medium" | "low"
  >("medium");

  const tasks = useQuery(api.autopilot.queries.work.listWorkItems, {
    organizationId,
    type: "task",
    status:
      statusFilter === "all"
        ? undefined
        : (statusFilter as
            | "backlog"
            | "todo"
            | "in_progress"
            | "in_review"
            | "done"
            | "cancelled"),
  });

  const createTask = useMutation(api.autopilot.mutations.work.createWorkItem);

  const handleCreate = async () => {
    if (!(newTitle.trim() && newDescription.trim())) {
      toast.error("Title and description are required");
      return;
    }

    try {
      await createTask({
        organizationId,
        type: "task",
        title: newTitle.trim(),
        description: newDescription.trim(),
        priority: newPriority,
      });
      toast.success("Task created");
      setNewTitle("");
      setNewDescription("");
      setNewPriority("medium");
      setIsDialogOpen(false);
    } catch {
      toast.error("Failed to create task");
    }
  };

  if (tasks === undefined) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton
            className="h-24 w-full rounded-lg"
            key={`skel-${String(i)}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{tasks.length} tasks</Badge>
        </div>
        <div className="flex items-center gap-3">
          <Select
            onValueChange={(val) => setStatusFilter(val as StatusFilter)}
            value={statusFilter}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isAdmin && (
            <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
              <DialogTrigger>
                <Button className="gap-2" size="sm">
                  <IconPlus className="size-4" />
                  New Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Task</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="font-medium text-sm" htmlFor="task-title">
                      Title
                    </label>
                    <Input
                      id="task-title"
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="What needs to be done?"
                      value={newTitle}
                    />
                  </div>
                  <div>
                    <label
                      className="font-medium text-sm"
                      htmlFor="task-description"
                    >
                      Description
                    </label>
                    <Textarea
                      id="task-description"
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Describe the task in detail..."
                      rows={4}
                      value={newDescription}
                    />
                  </div>
                  <div>
                    <label
                      className="font-medium text-sm"
                      htmlFor="task-priority"
                    >
                      Priority
                    </label>
                    <Select
                      onValueChange={(val) =>
                        setNewPriority(
                          val as "critical" | "high" | "medium" | "low"
                        )
                      }
                      value={newPriority}
                    >
                      <SelectTrigger id="task-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={handleCreate}>
                    Create Task
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
          No tasks
          {statusFilter === "all" ? "" : ` with status "${statusFilter}"`}
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task._id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RoadmapPage() {
  const { organizationId } = useAutopilotContext();
  const [activeTab, setActiveTab] = useState<string>("initiatives");

  return (
    <div className="space-y-6">
      <H2 variant="card">Roadmap</H2>

      <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
        {ROADMAP_TABS.map((tab) => (
          <button
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "initiatives" && (
        <InitiativesBoard organizationId={organizationId} />
      )}
      {activeTab === "tasks" && <ActiveTasksTab />}
    </div>
  );
}
