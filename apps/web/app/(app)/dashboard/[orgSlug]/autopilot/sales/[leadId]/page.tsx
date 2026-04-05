"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { IconArrowLeft, IconMail, IconUserSearch } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { use } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { H2 } from "@/components/ui/typography";

const STATUS_STYLES = {
  discovered: "bg-blue-500/10 text-blue-500",
  contacted: "bg-purple-500/10 text-purple-500",
  replied: "bg-yellow-500/10 text-yellow-500",
  demo: "bg-orange-500/10 text-orange-500",
  converted: "bg-green-500/10 text-green-500",
  churned: "bg-red-500/10 text-red-500",
  disqualified: "bg-muted text-muted-foreground",
} as const;

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; leadId: string }>;
}) {
  const { orgSlug, leadId } = use(params);

  const lead = useQuery(api.autopilot.queries.leads.getLead, {
    leadId: leadId as Id<"autopilotLeads">,
  });

  if (lead === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-muted-foreground">Lead not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/${orgSlug}/autopilot/sales`}>
          <Button size="icon" variant="ghost">
            <IconArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <H2 variant="card">{lead.name}</H2>
          {lead.company && (
            <p className="text-muted-foreground text-sm">{lead.company}</p>
          )}
        </div>
        <Badge
          className={
            STATUS_STYLES[lead.status as keyof typeof STATUS_STYLES] ??
            STATUS_STYLES.discovered
          }
          variant="outline"
        >
          {lead.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lead.email && (
              <div className="flex items-center gap-2 text-sm">
                <IconMail className="size-4 text-muted-foreground" />
                {lead.email}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <IconUserSearch className="size-4 text-muted-foreground" />
              Source: {lead.source}
            </div>
            {lead.sourceUrl && (
              <a
                className="text-blue-500 text-sm hover:underline"
                href={lead.sourceUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                Source URL
              </a>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Created:{" "}
              {formatDistanceToNow(lead.createdAt, { addSuffix: true })}
            </p>
            <p>Outreach count: {lead.outreachCount}</p>
            {lead.lastContactedAt && (
              <p>
                Last contact:{" "}
                {formatDistanceToNow(lead.lastContactedAt, {
                  addSuffix: true,
                })}
              </p>
            )}
            {lead.nextFollowUpAt && (
              <p className="text-blue-500">
                Next follow-up:{" "}
                {formatDistanceToNow(lead.nextFollowUpAt, {
                  addSuffix: true,
                })}
              </p>
            )}
            {lead.convertedAt && (
              <p className="text-green-500">
                Converted:{" "}
                {formatDistanceToNow(lead.convertedAt, {
                  addSuffix: true,
                })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {lead.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <TiptapMarkdownEditor editable={false} minimal value={lead.notes} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
