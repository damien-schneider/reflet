"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const AGENT_COLORS: Record<string, string> = {
  pm: "bg-blue-500/10 text-blue-500",
  cto: "bg-purple-500/10 text-purple-500",
  dev: "bg-green-500/10 text-green-500",
  growth: "bg-pink-500/10 text-pink-500",
  support: "bg-teal-500/10 text-teal-500",
  sales: "bg-rose-500/10 text-rose-500",
  system: "bg-cyan-500/10 text-cyan-500",
};

export function AgentThreadsList({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const threads = useQuery(api.autopilot.queries.threads.listAgentThreads, {
    organizationId,
  });

  if (threads === undefined) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton
            className="h-14 w-full rounded-lg"
            key={`skel-${String(i)}`}
          />
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground text-sm">
        No agent threads yet
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {threads.map((thread) => (
        <div className="rounded-lg border p-3" key={thread._id}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                className={AGENT_COLORS[thread.agent] ?? ""}
                variant="secondary"
              >
                {thread.agent}
              </Badge>
              <span className="font-mono text-muted-foreground text-xs">
                {thread.threadId.slice(0, 12)}…
              </span>
            </div>
            <span className="text-muted-foreground text-xs">
              {thread.lastMessageAt
                ? formatDistanceToNow(thread.lastMessageAt, {
                    addSuffix: true,
                  })
                : formatDistanceToNow(thread.createdAt, { addSuffix: true })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
