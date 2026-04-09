"use client";

import { CaretUp as ChevronUp } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const TASK_STATUS_COLUMNS = [
  { label: "Planned", statuses: ["backlog", "todo"] },
  { label: "In Progress", statuses: ["in_progress", "in_review"] },
  { label: "Shipped", statuses: ["done"] },
] as const;

const PRIORITY_COLORS: Record<string, string> = {
  critical: "text-red-500",
  high: "text-orange-500",
  medium: "text-yellow-500",
  low: "text-muted-foreground",
};

const TYPE_BADGES: Record<string, string> = {
  initiative:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  story: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  task: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  bug: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  spec: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
};

export default function PublicRoadmapPageClient({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  const publicTasks = useQuery(
    api.autopilot.queries.tasks_public.listPublicRoadmapTasks,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const roadmapConfig = useQuery(
    api.organizations.tag_manager.getRoadmapConfig,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const roadmapFeedback = useQuery(
    api.feedback.roadmap.list,
    org?._id ? { organizationId: org._id } : "skip"
  );

  if (!(org && roadmapConfig)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  // Dual-mode: if public tasks exist, show task-based roadmap
  const hasPublicTasks = publicTasks && publicTasks.length > 0;

  if (hasPublicTasks) {
    return <TaskBasedRoadmap tasks={publicTasks} />;
  }

  // Fallback: feedback-based roadmap
  type RoadmapLane = NonNullable<
    NonNullable<typeof roadmapConfig>["lanes"]
  >[number];
  type FeedbackItem = NonNullable<typeof roadmapFeedback>[number];

  const primaryColor = org.primaryColor ?? "#3b82f6";
  const roadmapLanes: RoadmapLane[] = roadmapConfig.lanes ?? [];
  const allFeedback: FeedbackItem[] = roadmapFeedback ?? [];

  if (roadmapLanes.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-12">
          <h1 className="font-bold text-2xl">Roadmap</h1>
          <p className="mt-2 text-muted-foreground">
            No roadmap has been configured yet.
          </p>
        </div>
      </div>
    );
  }

  const feedbackByLane: Record<string, FeedbackItem[]> = {};
  for (const lane of roadmapLanes) {
    feedbackByLane[lane._id] = allFeedback.filter((f) =>
      f?.tags
        ?.filter((t): t is NonNullable<typeof t> => t !== null)
        .some((t) => t._id === lane._id)
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="font-bold text-3xl">Roadmap</h1>
        <p className="mt-2 text-muted-foreground">
          See what we&apos;re working on and what&apos;s coming next.
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {roadmapLanes.map((lane) => (
          <div
            className="w-80 flex-shrink-0 rounded-lg border bg-muted/30 p-4"
            key={lane._id}
          >
            <div className="mb-4 flex items-center gap-2">
              <div
                className="h-3 w-3 rounded"
                style={{ backgroundColor: lane.color }}
              />
              <h3 className="font-semibold">{lane.name}</h3>
              <Badge className="ml-auto" variant="secondary">
                {feedbackByLane[lane._id]?.length || 0}
              </Badge>
            </div>
            <div className="space-y-3">
              {feedbackByLane[lane._id]?.map((feedback) => (
                <RoadmapCard
                  feedback={feedback}
                  key={feedback._id}
                  primaryColor={primaryColor}
                />
              ))}
              {(!feedbackByLane[lane._id] ||
                feedbackByLane[lane._id].length === 0) && (
                <p className="py-4 text-center text-muted-foreground text-sm">
                  No items
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskBasedRoadmap({
  tasks,
}: {
  tasks: Array<{
    _id: string;
    title: string;
    type: string;
    status: string;
    priority: string;
    tags?: string[];
  }>;
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="font-bold text-3xl">Roadmap</h1>
        <p className="mt-2 text-muted-foreground">
          See what we&apos;re working on and what&apos;s coming next.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {TASK_STATUS_COLUMNS.map((column) => {
          const columnTasks = tasks.filter((t) =>
            (column.statuses as readonly string[]).includes(t.status)
          );
          return (
            <div key={column.label}>
              <div className="mb-4 flex items-center gap-2">
                <h3 className="font-semibold text-lg">{column.label}</h3>
                <Badge variant="secondary">{columnTasks.length}</Badge>
              </div>
              <div className="space-y-3">
                {columnTasks.map((task) => (
                  <TaskRoadmapCard key={task._id} task={task} />
                ))}
                {columnTasks.length === 0 && (
                  <p className="py-4 text-center text-muted-foreground text-sm">
                    No items
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskRoadmapCard({
  task,
}: {
  task: {
    _id: string;
    title: string;
    type: string;
    status: string;
    priority: string;
    tags?: string[];
  };
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <h4 className="flex-1 font-medium text-sm">{task.title}</h4>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Badge className={TYPE_BADGES[task.type] ?? ""} variant="secondary">
            {task.type}
          </Badge>
          <span
            className={`text-xs ${PRIORITY_COLORS[task.priority] ?? "text-muted-foreground"}`}
          >
            {task.priority}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

interface RoadmapCardProps {
  feedback: {
    _id: string;
    title: string;
    voteCount: number;
    tags?: Array<{
      _id: string;
      name: string;
      color: string;
      isRoadmapLane?: boolean;
    } | null>;
  };
  primaryColor: string;
}

function RoadmapCard({ feedback, primaryColor }: RoadmapCardProps) {
  const nonLaneTags =
    feedback.tags
      ?.filter(
        (t): t is NonNullable<typeof t> => t !== null && !t.isRoadmapLane
      )
      ?.slice(0, 2) ?? [];

  return (
    <Card className="cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:bg-accent/50 hover:shadow-md">
      <CardContent className="p-3">
        <h4 className="font-medium text-sm">{feedback.title}</h4>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {nonLaneTags.map((tag) => (
              <Badge
                className="text-xs"
                key={tag._id}
                style={{ borderColor: tag.color, color: tag.color }}
                variant="outline"
              >
                {tag.name}
              </Badge>
            ))}
          </div>
          <div
            className="flex items-center gap-1 text-xs"
            style={{ color: primaryColor }}
          >
            <ChevronUp className="h-3 w-3" />
            {feedback.voteCount}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
