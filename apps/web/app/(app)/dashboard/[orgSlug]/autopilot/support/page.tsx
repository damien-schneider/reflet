"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { IconHeadset, IconMessageCircle } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";

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

const STATUS_STYLES = {
  new: "bg-blue-500/10 text-blue-500",
  triaged: "bg-purple-500/10 text-purple-500",
  drafted: "bg-yellow-500/10 text-yellow-500",
  replied: "bg-green-500/10 text-green-500",
  escalated: "bg-orange-500/10 text-orange-500",
  resolved: "bg-muted text-muted-foreground",
} as const;

export default function SupportPanelPage() {
  const { organizationId } = useAutopilotContext();

  const stats = useQuery(api.autopilot.support_queries.getSupportStats, {
    organizationId,
  });

  const conversations = useQuery(
    api.autopilot.support_queries.listSupportConversations,
    { organizationId, limit: 50 }
  );

  if (stats === undefined || conversations === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton className="h-24 rounded-lg" key={`stat-${String(i)}`} />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <H2 variant="card">Support Panel</H2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>New</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl">{stats.newCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Drafted Replies</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl text-yellow-500">
              {stats.draftedCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Escalated</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl text-orange-500">
              {stats.escalatedCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approval Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-2xl text-green-500">
              {stats.responseApprovalRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conversations List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <IconMessageCircle className="size-5" />
            Conversations ({conversations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {conversations.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-center">
              <div>
                <IconHeadset className="mx-auto mb-2 size-8 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">
                  No support conversations yet.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((convo) => (
                <div
                  className="flex items-start gap-3 rounded-lg border p-3"
                  key={convo._id}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {convo.subject}
                      </span>
                      <Badge
                        className={cn(
                          "text-xs",
                          STATUS_STYLES[
                            convo.status as keyof typeof STATUS_STYLES
                          ]
                        )}
                        variant="outline"
                      >
                        {convo.status}
                      </Badge>
                    </div>
                    {convo.userEmail && (
                      <p className="mt-1 text-muted-foreground text-xs">
                        From: {convo.userEmail}
                      </p>
                    )}
                    {convo.agentDraftReply && (
                      <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
                        Draft: {convo.agentDraftReply}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-muted-foreground text-xs">
                    {convo.updatedAt
                      ? formatDistanceToNow(convo.updatedAt, {
                          addSuffix: true,
                        })
                      : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
