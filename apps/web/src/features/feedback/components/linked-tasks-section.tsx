"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconLink,
  IconPlus,
  IconSquareRoundedCheck,
  IconX,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

const STATUS_COLORS: Record<string, string> = {
  backlog: "bg-muted-foreground",
  todo: "bg-blue-500",
  in_progress: "bg-yellow-500",
  in_review: "bg-purple-500",
  done: "bg-green-500",
  cancelled: "bg-red-500",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "border-red-500 text-red-500",
  high: "border-orange-500 text-orange-500",
  medium: "border-yellow-500 text-yellow-500",
  low: "border-muted-foreground text-muted-foreground",
};

interface LinkedTasksSectionProps {
  feedbackId: Id<"feedback">;
  isAdmin: boolean;
  organizationId: Id<"organizations">;
}

export function LinkedTasksSection({
  feedbackId,
  isAdmin,
  organizationId,
}: LinkedTasksSectionProps) {
  const linkedTasks = useQuery(
    api.autopilot.queries.feedback_links.getTasksForFeedback,
    { feedbackId }
  );

  const unlinkMutation = useMutation(
    api.autopilot.mutations.feedback_links.unlinkFeedbackFromTask
  );

  const handleUnlink = async (workItemId: Id<"autopilotWorkItems">) => {
    try {
      await unlinkMutation({ feedbackId, workItemId });
      toast.success("Task unlinked");
    } catch {
      toast.error("Failed to unlink task");
    }
  };

  if (linkedTasks === undefined) {
    return (
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Linked Tasks</h3>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Linked Tasks</h3>
          {isAdmin && (
            <div className="flex gap-1">
              <LinkTaskDialog
                feedbackId={feedbackId}
                organizationId={organizationId}
              />
              <CreateTaskFromFeedbackDialog
                feedbackId={feedbackId}
                organizationId={organizationId}
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {linkedTasks.length === 0 ? (
          <p className="text-muted-foreground text-sm">No linked tasks</p>
        ) : (
          <div className="space-y-2">
            {linkedTasks.map((task) => (
              <div
                className="flex items-center gap-2 rounded-md border p-2"
                key={task._id}
              >
                <div
                  className={`size-2 shrink-0 rounded-full ${STATUS_COLORS[task.status] ?? "bg-muted-foreground"}`}
                />
                <span className="flex-1 truncate text-sm">{task.title}</span>
                <Badge
                  className={PRIORITY_COLORS[task.priority] ?? ""}
                  variant="outline"
                >
                  {task.priority}
                </Badge>
                {isAdmin && (
                  <button
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    onClick={() => handleUnlink(task._id)}
                    title="Unlink task"
                    type="button"
                  >
                    <IconX className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LinkTaskDialog({
  feedbackId,
  organizationId,
}: {
  feedbackId: Id<"feedback">;
  organizationId: Id<"organizations">;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const allTasks = useQuery(
    api.autopilot.queries.work.listWorkItems,
    open ? { organizationId, limit: 50 } : "skip"
  );

  const linkMutation = useMutation(
    api.autopilot.mutations.feedback_links.linkFeedbackToTask
  );

  const filtered = (allTasks ?? []).filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleLink = async (workItemId: Id<"autopilotWorkItems">) => {
    try {
      await linkMutation({ organizationId, feedbackId, workItemId });
      toast.success("Task linked");
      setOpen(false);
      setSearch("");
    } catch {
      toast.error("Failed to link task");
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={<Button size="icon" title="Link to task" variant="ghost" />}
      >
        <IconLink className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link to Task</DialogTitle>
        </DialogHeader>
        <Input
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks..."
          value={search}
        />
        <div className="max-h-60 space-y-1 overflow-y-auto">
          {filtered.map((task) => (
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              key={task._id}
              onClick={() => handleLink(task._id)}
              type="button"
            >
              <div
                className={`size-2 shrink-0 rounded-full ${STATUS_COLORS[task.status] ?? "bg-muted-foreground"}`}
              />
              <span className="flex-1 truncate">{task.title}</span>
              <Badge variant="outline">{task.type}</Badge>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="py-4 text-center text-muted-foreground text-sm">
              No tasks found
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateTaskFromFeedbackDialog({
  feedbackId,
  organizationId,
}: {
  feedbackId: Id<"feedback">;
  organizationId: Id<"organizations">;
}) {
  const [open, setOpen] = useState(false);
  const [taskType, setTaskType] = useState<"task" | "bug">("task");
  const [priority, setPriority] = useState<
    "critical" | "high" | "medium" | "low"
  >("medium");

  const createMutation = useMutation(
    api.autopilot.mutations.feedback_links.createTaskFromFeedback
  );

  const handleCreate = async () => {
    try {
      await createMutation({
        organizationId,
        feedbackId,
        type: taskType,
        priority,
      });
      toast.success("Task created and linked");
      setOpen(false);
    } catch {
      toast.error("Failed to create task");
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={
          <Button
            size="icon"
            title="Create task from feedback"
            variant="ghost"
          />
        }
      >
        <IconPlus className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Task from Feedback</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="link-task-type">Type</Label>
            <Select
              onValueChange={(v) => setTaskType(v as "task" | "bug")}
              value={taskType}
            >
              <SelectTrigger id="link-task-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="link-task-priority">Priority</Label>
            <Select
              onValueChange={(v) =>
                setPriority(v as "critical" | "high" | "medium" | "low")
              }
              value={priority}
            >
              <SelectTrigger id="link-task-priority">
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
            <IconSquareRoundedCheck className="mr-2 size-4" />
            Create Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
