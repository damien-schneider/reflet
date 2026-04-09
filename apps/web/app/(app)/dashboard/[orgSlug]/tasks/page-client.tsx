"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconChecklist,
  IconLayoutKanban,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { H2, Muted } from "@/components/ui/typography";
import { TaskCard } from "@/features/autopilot/components/task-card";
import { InitiativesBoard } from "@/features/autopilot/components/views/initiatives-board";
import { cn } from "@/lib/utils";

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

const TYPE_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Initiative", value: "initiative" },
  { label: "Story", value: "story" },
  { label: "Task", value: "task" },
  { label: "Spec", value: "spec" },
  { label: "Bug", value: "bug" },
] as const;

const PRIORITY_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Critical", value: "critical" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
] as const;

const VIEW_TABS = [
  { id: "list", label: "List", icon: IconChecklist },
  { id: "board", label: "Board", icon: IconLayoutKanban },
] as const;

type ViewMode = "list" | "board";

export default function TasksPageClient() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const membership = useQuery(
    api.organizations.members.getMembership,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const isAdmin = membership?.role === "admin" || membership?.role === "owner";

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const tasks = useQuery(
    api.autopilot.queries.work.listWorkItems,
    org?._id
      ? {
          organizationId: org._id,
          type:
            typeFilter === "all"
              ? undefined
              : (typeFilter as
                  | "initiative"
                  | "story"
                  | "task"
                  | "spec"
                  | "bug"),
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
        }
      : "skip"
  );

  if (org === undefined) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton className="h-9 w-28" key={`f-${String(i)}`} />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton
              className="h-24 w-full rounded-lg"
              key={`s-${String(i)}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <H2 variant="card">Organization not found</H2>
          <Muted className="mt-2">
            The organization you&apos;re looking for doesn&apos;t exist.
          </Muted>
        </div>
      </div>
    );
  }

  const filteredTasks = (tasks ?? []).filter((task) => {
    if (priorityFilter !== "all" && task.priority !== priorityFilter) {
      return false;
    }
    if (
      searchQuery &&
      !task.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <H2 variant="card">Tasks</H2>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
            {VIEW_TABS.map((tab) => (
              <button
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
                  viewMode === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                key={tab.id}
                onClick={() => setViewMode(tab.id as ViewMode)}
                type="button"
              >
                <tab.icon className="size-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {isAdmin && (
            <CreateTaskDialog
              isOpen={isDialogOpen}
              onOpenChange={setIsDialogOpen}
              organizationId={org._id}
            />
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <IconSearch className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            value={searchQuery}
          />
        </div>
        <Select
          onValueChange={(val) => setStatusFilter(val as StatusFilter)}
          value={statusFilter}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          onValueChange={(val) => setTypeFilter(val ?? "all")}
          value={typeFilter}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          onValueChange={(val) => setPriorityFilter(val ?? "all")}
          value={priorityFilter}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary">{filteredTasks.length} tasks</Badge>
      </div>

      {/* Content */}
      {viewMode === "board" ? (
        <InitiativesBoard organizationId={org._id} />
      ) : (
        <TaskListView tasks={filteredTasks} />
      )}
    </div>
  );
}

function TaskListView({ tasks }: { tasks: Doc<"autopilotWorkItems">[] }) {
  if (tasks.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
        No tasks found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskCard key={task._id} task={task} />
      ))}
    </div>
  );
}

function CreateTaskDialog({
  isOpen,
  onOpenChange,
  organizationId,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: Id<"organizations">;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState<"task" | "bug" | "story">("task");
  const [taskPriority, setTaskPriority] = useState<
    "critical" | "high" | "medium" | "low"
  >("medium");
  const [isPublic, setIsPublic] = useState(false);

  const createTask = useMutation(api.autopilot.mutations.work.createWorkItem);

  const handleCreate = async () => {
    if (!(title.trim() && description.trim())) {
      toast.error("Title and description are required");
      return;
    }

    try {
      await createTask({
        organizationId,
        type: taskType,
        title: title.trim(),
        description: description.trim(),
        priority: taskPriority,
        isPublicRoadmap: isPublic || undefined,
      });
      toast.success("Task created");
      setTitle("");
      setDescription("");
      setTaskType("task");
      setTaskPriority("medium");
      setIsPublic(false);
      onOpenChange(false);
    } catch {
      toast.error("Failed to create task");
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
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
            <Label htmlFor="new-task-title">Title</Label>
            <Input
              id="new-task-title"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              value={title}
            />
          </div>
          <div>
            <Label htmlFor="new-task-desc">Description</Label>
            <Textarea
              id="new-task-desc"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task in detail..."
              rows={4}
              value={description}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="new-task-type">Type</Label>
              <Select
                onValueChange={(v) =>
                  setTaskType(v as "task" | "bug" | "story")
                }
                value={taskType}
              >
                <SelectTrigger id="new-task-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="new-task-priority">Priority</Label>
              <Select
                onValueChange={(v) =>
                  setTaskPriority(v as "critical" | "high" | "medium" | "low")
                }
                value={taskPriority}
              >
                <SelectTrigger id="new-task-priority">
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
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="font-medium text-sm" htmlFor="public-toggle">
                Public Roadmap
              </Label>
              <p className="text-muted-foreground text-xs">
                Show this task on the public roadmap
              </p>
            </div>
            <Switch
              checked={isPublic}
              id="public-toggle"
              onCheckedChange={setIsPublic}
            />
          </div>
          <Button className="w-full" onClick={handleCreate}>
            Create Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
