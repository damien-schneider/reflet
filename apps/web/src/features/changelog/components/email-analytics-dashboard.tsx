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
  ArrowDown,
  ArrowUp,
  ChartBar,
  EnvelopeSimple,
  Eye,
  LinkSimple,
  Warning,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
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
  password_reset: "Password Reset",
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

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
}: {
  icon: React.ElementType;
  subtext?: string;
  title: string;
  trend?: "up" | "down" | "neutral";
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-muted-foreground text-sm">{title}</p>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-2xl tabular-nums">{value}</p>
            {trend && trend !== "neutral" && (
              <span
                className={cn(
                  "flex items-center text-xs",
                  trend === "up" ? "text-success-text" : "text-destructive-text"
                )}
              >
                {trend === "up" ? (
                  <ArrowUp aria-hidden className="h-3 w-3" />
                ) : (
                  <ArrowDown aria-hidden className="h-3 w-3" />
                )}
                <span className="sr-only">
                  {trend === "up" ? "Trending up" : "Trending down"}
                </span>
              </span>
            )}
          </div>
          {subtext && (
            <p className="text-muted-foreground text-xs tabular-nums">
              {subtext}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {["a", "b", "c", "d"].map((id) => (
            <Skeleton className="h-24" key={id} />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">Email Analytics</h2>
          <p className="text-muted-foreground text-sm">
            Track delivery, opens, and engagement for your notification emails.
          </p>
        </div>
        <Select onValueChange={(v) => setDays(Number(v))} value={String(days)}>
          <SelectTrigger aria-label="Time range" className="w-40">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={EnvelopeSimple}
          subtext={`${stats.delivered} delivered`}
          title="Emails Sent"
          value={stats.total}
        />
        <StatCard
          icon={Eye}
          subtext={formatPercent(stats.openRate)}
          title="Open Rate"
          value={stats.opened}
        />
        <StatCard
          icon={LinkSimple}
          subtext={formatPercent(stats.clickRate)}
          title="Click Rate"
          value={stats.clicked}
        />
        <StatCard
          icon={Warning}
          subtext={formatPercent(stats.bounceRate)}
          title="Bounce Rate"
          trend={stats.bounceRate > 0.05 ? "down" : "neutral"}
          value={stats.bounced}
        />
      </div>

      {byType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ChartBar className="h-4 w-4" />
              By Email Type
            </CardTitle>
            <CardDescription>
              Performance breakdown by notification type
            </CardDescription>
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
                  <TableHead className="text-right">Open Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byType.map((row) => (
                  <TableRow key={row.emailType}>
                    <TableCell className="font-medium">
                      {EMAIL_TYPE_LABELS[row.emailType] ?? row.emailType}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.total}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.delivered}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.opened}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.bounced}
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
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <EnvelopeSimple className="h-4 w-4" />
            Recent Emails
          </CardTitle>
          <CardDescription>
            Latest emails sent from your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentEmails.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia>
                  <EnvelopeSimple className="h-6 w-6" />
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
                {recentEmails.map((email) => (
                  <TableRow key={email._id}>
                    <TableCell className="max-w-48 truncate font-mono text-sm">
                      {email.to}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {EMAIL_TYPE_LABELS[email.emailType] ?? email.emailType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge color={STATUS_COLORS[email.status] ?? "neutral"}>
                        {email.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {formatDistanceToNow(email.sentAt, { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
