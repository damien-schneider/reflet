"use client";

import { Badge, type BadgeColor } from "@ctrl-ui/react/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ctrl-ui/react/ui/table";
import {
  ChartBar,
  EnvelopeSimple,
  Eye,
  LinkSimple,
  Warning,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";

const TIME_RANGES = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
] as const;

const EMAIL_TYPE_LABELS: Record<string, string> = {
  changelog_notification: "Changelog",
  feedback_shipped: "Shipped",
  invitation: "Invitation",
  other: "Other",
  password_reset: "Password reset",
  verification: "Verification",
  weekly_digest: "Digest",
  welcome: "Welcome",
} as const;

const STATUS_COLORS: Record<string, BadgeColor> = {
  bounced: "red",
  clicked: "green",
  complained: "red",
  delivered: "green",
  delivery_delayed: "yellow",
  opened: "blue",
  sent: "neutral",
} as const;

const HIGH_BOUNCE_RATE = 0.05;
const STAT_CARD_IDS = ["sent", "opened", "clicked", "bounced"] as const;

type EmailTypeRows = FunctionReturnType<
  typeof api.email.analytics.getEmailStatsByType
>;
type RecentEmails = FunctionReturnType<
  typeof api.email.analytics.getRecentEmails
>;

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function StatCard({
  icon: Icon,
  stat,
  warn,
}: {
  icon: typeof EnvelopeSimple;
  stat: { detail: string; title: string; value: number };
  warn?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon aria-hidden className="size-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-muted-foreground text-sm">{stat.title}</p>
          <p className="font-semibold text-2xl tabular-nums">
            {stat.value.toLocaleString()}
          </p>
          <p
            className={cn(
              "flex items-center gap-1 text-xs tabular-nums",
              warn ? "text-warning-text" : "text-muted-foreground"
            )}
          >
            {warn && <Warning aria-hidden className="size-3" />}
            {stat.detail}
            {warn && <span className="sr-only"> (above 5%)</span>}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARD_IDS.map((id) => (
          <Card key={id}>
            <CardContent className="flex items-center gap-4 p-4">
              <Skeleton className="size-10" />
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-6 w-14" />
                <Skeleton className="h-3 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3.5 w-56" />
        </CardHeader>
        <CardContent className="space-y-3">
          {["a", "b", "c", "d", "e"].map((id) => (
            <Skeleton className="h-8 w-full" key={id} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function EmailAnalyticsDashboard({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const [days, setDays] = useState(30);

  const stats = useQuery(api.email.analytics.getEmailStats, {
    days,
    organizationId,
  });

  const byType = useQuery(api.email.analytics.getEmailStatsByType, {
    days,
    organizationId,
  });

  const recentEmails = useQuery(api.email.analytics.getRecentEmails, {
    limit: 20,
    organizationId,
  });

  const isLoading =
    stats === undefined || byType === undefined || recentEmails === undefined;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Select onValueChange={(v) => setDays(Number(v))} value={String(days)}>
          <SelectTrigger aria-label="Time range" className="w-40" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={EnvelopeSimple}
              stat={{
                detail: `${stats.delivered.toLocaleString()} delivered`,
                title: "Sent",
                value: stats.total,
              }}
            />
            <StatCard
              icon={Eye}
              stat={{
                detail: `${formatPercent(stats.openRate)} open rate`,
                title: "Opened",
                value: stats.opened,
              }}
            />
            <StatCard
              icon={LinkSimple}
              stat={{
                detail: `${formatPercent(stats.clickRate)} click rate`,
                title: "Clicked",
                value: stats.clicked,
              }}
            />
            <StatCard
              icon={Warning}
              stat={{
                detail: `${formatPercent(stats.bounceRate)} bounce rate`,
                title: "Bounced",
                value: stats.bounced,
              }}
              warn={stats.bounceRate > HIGH_BOUNCE_RATE}
            />
          </div>

          {byType.length > 0 && <ByTypeTable rows={byType} />}
          <RecentEmailsCard emails={recentEmails} />
        </>
      )}
    </div>
  );
}

function ByTypeTable({ rows }: { rows: EmailTypeRows }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartBar aria-hidden className="size-4" />
          By email type
        </CardTitle>
        <CardDescription>Performance by notification type</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Sent</TableHead>
              <TableHead className="text-right">Delivered</TableHead>
              <TableHead className="text-right">Opened</TableHead>
              <TableHead className="text-right">Bounced</TableHead>
              <TableHead className="text-right">Open rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.emailType}>
                <TableCell className="font-medium">
                  {EMAIL_TYPE_LABELS[row.emailType] ?? row.emailType}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.total.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.delivered.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.opened.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.bounced.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.delivered > 0
                    ? formatPercent(row.opened / row.delivered)
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RecentEmailsCard({ emails }: { emails: RecentEmails }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <EnvelopeSimple aria-hidden className="size-4" />
          Recent emails
        </CardTitle>
        <CardDescription>
          Latest emails sent from your organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        {emails.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia>
                <EnvelopeSimple aria-hidden className="size-6" />
              </EmptyMedia>
              <EmptyTitle>No emails sent yet</EmptyTitle>
              <EmptyDescription>
                Publish a release to start sending notifications.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emails.map((email) => (
                <TableRow key={email._id}>
                  <TableCell
                    className="max-w-48 truncate font-mono text-sm"
                    title={email.to}
                  >
                    {email.to}
                  </TableCell>
                  <TableCell>
                    <Badge size="sm" variant="outline">
                      {EMAIL_TYPE_LABELS[email.emailType] ?? email.emailType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      color={STATUS_COLORS[email.status] ?? "neutral"}
                      size="sm"
                    >
                      {email.status.replaceAll("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm tabular-nums">
                    <time
                      dateTime={new Date(email.sentAt).toISOString()}
                      title={format(email.sentAt, "MMM d, yyyy, h:mm a")}
                    >
                      {formatDistanceToNow(email.sentAt, { addSuffix: true })}
                    </time>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
