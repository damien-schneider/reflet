"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconChevronDown,
  IconChevronRight,
  IconTargetArrow,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { H2 } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { cn } from "@/lib/utils";

const STATUS_ORDER = [
  "discovery",
  "definition",
  "active",
  "completed",
] as const;

const STATUS_LABELS: Record<string, string> = {
  discovery: "Discovery",
  definition: "Definition",
  active: "Active",
  completed: "Completed",
  paused: "Paused",
  cancelled: "Cancelled",
};

const STATUS_STYLES: Record<string, string> = {
  discovery: "bg-blue-500/10 text-blue-500",
  definition: "bg-purple-500/10 text-purple-500",
  active: "bg-green-500/10 text-green-500",
  completed: "bg-emerald-500/10 text-emerald-500",
  paused: "bg-muted text-muted-foreground",
  cancelled: "bg-red-500/10 text-red-500",
};

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-red-500/10 text-red-500",
  high: "bg-orange-500/10 text-orange-500",
  medium: "bg-yellow-500/10 text-yellow-500",
  low: "bg-muted text-muted-foreground",
};

const STORY_STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ready: "bg-blue-500/10 text-blue-500",
  in_spec: "bg-purple-500/10 text-purple-500",
  in_dev: "bg-amber-500/10 text-amber-500",
  in_review: "bg-cyan-500/10 text-cyan-500",
  shipped: "bg-green-500/10 text-green-500",
  cancelled: "bg-red-500/10 text-red-500",
};

function InitiativeCard({
  initiative,
}: {
  initiative: {
    _id: Id<"autopilotInitiatives">;
    title: string;
    description: string;
    priority: string;
    completionPercent: number;
    targetDate?: number;
    status: string;
  };
}) {
  const [expanded, setExpanded] = useState(false);

  const stories = useQuery(
    api.autopilot.queries.initiatives.listStoriesByInitiative,
    expanded ? { initiativeId: initiative._id } : "skip"
  );

  const ChevronIcon = expanded ? IconChevronDown : IconChevronRight;

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <ChevronIcon className="size-4 shrink-0 text-muted-foreground" />
            <CardTitle className="text-base">{initiative.title}</CardTitle>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge
              className={cn(
                "text-xs",
                PRIORITY_STYLES[initiative.priority] ?? PRIORITY_STYLES.medium
              )}
              variant="outline"
            >
              {initiative.priority}
            </Badge>
            <Badge
              className={cn(
                "text-xs",
                STATUS_STYLES[initiative.status] ?? STATUS_STYLES.discovery
              )}
              variant="outline"
            >
              {STATUS_LABELS[initiative.status] ?? initiative.status}
            </Badge>
          </div>
        </div>
        <CardDescription className="ml-6">
          <span className="line-clamp-2">{initiative.description}</span>
          <span className="mt-1 flex items-center gap-3 text-xs">
            <span>{initiative.completionPercent}% complete</span>
            {initiative.targetDate && (
              <span className="flex items-center gap-1">
                <IconTargetArrow className="size-3" />
                {formatDistanceToNow(initiative.targetDate, {
                  addSuffix: true,
                })}
              </span>
            )}
          </span>
        </CardDescription>
      </CardHeader>

      {expanded && (
        <CardContent>
          <div className="ml-6 border-l pl-4">
            {stories === undefined && (
              <div className="space-y-2">
                {Array.from({ length: 2 }, (_, i) => (
                  <Skeleton
                    className="h-8 w-full rounded"
                    key={`story-skel-${String(i)}`}
                  />
                ))}
              </div>
            )}
            {stories !== undefined && stories.length === 0 && (
              <p className="py-2 text-muted-foreground text-sm">
                No user stories yet
              </p>
            )}
            {stories !== undefined && stories.length > 0 && (
              <div className="space-y-2">
                {stories.map((story) => (
                  <div
                    className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
                    key={story._id}
                  >
                    <span className="text-sm">{story.title}</span>
                    <Badge
                      className={cn(
                        "text-xs",
                        STORY_STATUS_STYLES[story.status] ??
                          STORY_STATUS_STYLES.draft
                      )}
                      variant="outline"
                    >
                      {story.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function RoadmapPage() {
  const { organizationId } = useAutopilotContext();

  const initiatives = useQuery(
    api.autopilot.queries.initiatives.listInitiatives,
    { organizationId }
  );

  if (initiatives === undefined) {
    return (
      <div className="space-y-6">
        <H2 variant="card">Roadmap</H2>
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton
              className="h-32 w-full rounded-lg"
              key={`skel-${String(i)}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (initiatives.length === 0) {
    return (
      <div className="space-y-6">
        <H2 variant="card">Roadmap</H2>
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
          No initiatives yet
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <H2 variant="card">Roadmap</H2>

      {STATUS_ORDER.map((status) => {
        const filtered = initiatives.filter((i) => i.status === status);
        if (filtered.length === 0) {
          return null;
        }

        return (
          <section key={status}>
            <div className="mb-3 flex items-center gap-2">
              <Badge
                className={cn(
                  "text-xs",
                  STATUS_STYLES[status] ?? STATUS_STYLES.discovery
                )}
                variant="outline"
              >
                {STATUS_LABELS[status]}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {filtered.length} initiative{filtered.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="space-y-3">
              {filtered.map((initiative) => (
                <InitiativeCard initiative={initiative} key={initiative._id} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
