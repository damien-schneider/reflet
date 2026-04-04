"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { IconArrowDown, IconArrowLeft, IconArrowUp } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { use } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { H2, Muted } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  draft: "bg-muted text-muted-foreground",
  pending_review: "bg-yellow-500/10 text-yellow-500",
  approved: "bg-green-500/10 text-green-500",
  sent: "bg-blue-500/10 text-blue-500",
  received: "bg-purple-500/10 text-purple-500",
  rejected: "bg-red-500/10 text-red-500",
} as const;

function EmailDetail({ emailId }: { emailId: Id<"autopilotEmails"> }) {
  const { orgSlug } = useAutopilotContext();
  const email = useQuery(api.autopilot.queries.email.getEmail, { emailId });
  const thread = useQuery(
    api.autopilot.queries.email.getEmailThread,
    email?.threadId ? { threadId: email.threadId } : "skip"
  );

  if (email === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="space-y-4">
        <Link href={`/dashboard/${orgSlug}/autopilot/email`}>
          <Button className="gap-1.5" size="sm" variant="ghost">
            <IconArrowLeft className="size-4" />
            Back to emails
          </Button>
        </Link>
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
          Email not found
        </div>
      </div>
    );
  }

  const isInbound = email.direction === "inbound";
  const statusStyle =
    STATUS_STYLES[email.status as keyof typeof STATUS_STYLES] ??
    STATUS_STYLES.draft;

  const threadEmails = thread?.filter((e) => e._id !== emailId) ?? [];

  return (
    <div className="space-y-6">
      <Link href={`/dashboard/${orgSlug}/autopilot/email`}>
        <Button className="gap-1.5" size="sm" variant="ghost">
          <IconArrowLeft className="size-4" />
          Back to emails
        </Button>
      </Link>

      <div className="rounded-lg border p-6">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 rounded-full p-2",
              isInbound
                ? "bg-purple-500/10 text-purple-500"
                : "bg-blue-500/10 text-blue-500"
            )}
          >
            {isInbound ? (
              <IconArrowDown className="size-4" />
            ) : (
              <IconArrowUp className="size-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge className={cn("text-xs", statusStyle)} variant="outline">
                {email.status}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {format(email.createdAt, "PPp")}
                {" ("}
                {formatDistanceToNow(email.createdAt, { addSuffix: true })}
                {")"}
              </span>
            </div>
            <h3 className="mt-2 font-semibold text-lg">{email.subject}</h3>
            <div className="mt-1 space-y-0.5 text-muted-foreground text-sm">
              <p>From: {email.from}</p>
              <p>To: {email.to.join(", ")}</p>
              {email.draftedByAgent && (
                <p>
                  Drafted by:{" "}
                  <Badge className="text-xs" variant="secondary">
                    {email.draftedByAgent}
                  </Badge>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 whitespace-pre-wrap rounded-md bg-muted/50 p-4 text-sm">
          {email.bodyText}
        </div>
      </div>

      {threadEmails.length > 0 && (
        <div className="space-y-3">
          <H2 variant="card">Thread</H2>
          <Muted>
            {threadEmails.length} other{" "}
            {threadEmails.length === 1 ? "email" : "emails"} in this thread
          </Muted>
          {threadEmails.map((threadEmail) => {
            const threadInbound = threadEmail.direction === "inbound";
            const threadStatus =
              STATUS_STYLES[threadEmail.status as keyof typeof STATUS_STYLES] ??
              STATUS_STYLES.draft;

            return (
              <Link
                className="block rounded-lg border p-4 transition-colors hover:bg-muted/50"
                href={`/dashboard/${orgSlug}/autopilot/email/${threadEmail._id}`}
                key={threadEmail._id}
              >
                <div className="flex items-center gap-2">
                  {threadInbound ? (
                    <IconArrowDown className="size-3.5 text-purple-500" />
                  ) : (
                    <IconArrowUp className="size-3.5 text-blue-500" />
                  )}
                  <Badge
                    className={cn("text-xs", threadStatus)}
                    variant="outline"
                  >
                    {threadEmail.status}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {formatDistanceToNow(threadEmail.createdAt, {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
                  {threadEmail.bodyText}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AutopilotEmailDetailPage({
  params,
}: {
  params: Promise<{ emailId: string }>;
}) {
  const { emailId } = use(params);

  return <EmailDetail emailId={emailId as Id<"autopilotEmails">} />;
}
