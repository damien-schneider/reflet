"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import {
  IconArrowDown,
  IconArrowUp,
  IconMail,
  IconMailForward,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { H2 } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { cn } from "@/lib/utils";

type DirectionFilter = "all" | "inbound" | "outbound";

const STATUS_STYLES = {
  draft: "bg-muted text-muted-foreground",
  pending_review: "bg-yellow-500/10 text-yellow-500",
  approved: "bg-green-500/10 text-green-500",
  sent: "bg-blue-500/10 text-blue-500",
  received: "bg-purple-500/10 text-purple-500",
  rejected: "bg-red-500/10 text-red-500",
} as const;

export default function AutopilotEmailPage() {
  const { organizationId, orgSlug } = useAutopilotContext();
  const [directionFilter, setDirectionFilter] =
    useState<DirectionFilter>("all");

  const emails = useQuery(api.autopilot.queries.listEmails, {
    organizationId,
    direction:
      directionFilter === "all"
        ? undefined
        : (directionFilter as "inbound" | "outbound"),
    limit: 50,
  });

  if (emails === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton
            className="h-20 w-full rounded-lg"
            key={`skel-${String(i)}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <H2 variant="card">Email</H2>
        <div className="flex items-center gap-1">
          {(
            [
              { label: "All", value: "all", icon: IconMail },
              { label: "Inbound", value: "inbound", icon: IconArrowDown },
              { label: "Outbound", value: "outbound", icon: IconMailForward },
            ] as const
          ).map((opt) => (
            <Button
              className="gap-1.5"
              key={opt.value}
              onClick={() => setDirectionFilter(opt.value)}
              size="sm"
              variant={directionFilter === opt.value ? "secondary" : "ghost"}
            >
              <opt.icon className="size-3.5" />
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {emails.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
          No emails yet
        </div>
      ) : (
        <div className="space-y-2">
          {emails.map((email) => {
            const isInbound = email.direction === "inbound";
            const statusStyle =
              STATUS_STYLES[email.status as keyof typeof STATUS_STYLES] ??
              STATUS_STYLES.draft;

            return (
              <Link
                className="block rounded-lg border p-4 transition-colors hover:bg-muted/50"
                href={`/dashboard/${orgSlug}/autopilot/email/${email._id}`}
                key={email._id}
              >
                {" "}
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-1 rounded-full p-1.5",
                      isInbound
                        ? "bg-purple-500/10 text-purple-500"
                        : "bg-blue-500/10 text-blue-500"
                    )}
                  >
                    {isInbound ? (
                      <IconArrowDown className="size-3.5" />
                    ) : (
                      <IconArrowUp className="size-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={cn("text-xs", statusStyle)}
                        variant="outline"
                      >
                        {email.status}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {formatDistanceToNow(email.createdAt, {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <h3 className="mt-1 font-medium">{email.subject}</h3>
                    <p className="text-muted-foreground text-sm">
                      {isInbound
                        ? `From: ${email.from}`
                        : `To: ${email.to.join(", ")}`}
                    </p>
                    <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
                      {email.bodyText}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
