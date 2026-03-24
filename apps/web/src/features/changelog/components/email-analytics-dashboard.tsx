"use client";

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

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const TIME_RANGES = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
] as const;

const EMAIL_TYPE_LABELS: Record<string, string> = {
  changelog_notification: "Changelog",
  feedback_shipped: "Shipped",
  weekly_digest: "Digest",
  invitation: "Invitation",
  verification: "Verification",
  welcome: "Welcome",
  password_reset: "Password Reset",
  other: "Other",
} as const;

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  sent: "secondary",
  delivered: "default",
  opened: "default",
  clicked: "default",
  bounced: "destructive",
  complained: "destructive",
  delivery_delayed: "outline",
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
            <p className="font-semibold text-2xl">{value}</p>
            {trend && trend !== "neutral" && (
              <span
                className={cn(
                  "flex items-center text-xs",
                  trend === "up" ? "text-green-600" : "text-red-600"
                )}
              >
                {trend === "up" ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )}
              </span>
            )}
          </div>
          {subtext && (
            <p className="text-muted-foreground text-xs">{subtext}</p>
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
    organizationId,
    days,
  });

  const byType = useQuery(api.email.analytics.getEmailStatsByType, {
    organizationId,
    days,
  });

  const recentEmails = useQuery(api.email.analytics.getRecentEmails, {
    organizationId,
    limit: 20,
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
          <SelectTrigger className="w-40">
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

      {/* Stats cards */}
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

      {/* By type breakdown */}
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
                    <TableCell className="text-right">{row.total}</TableCell>
                    <TableCell className="text-right">
                      {row.delivered}
                    </TableCell>
                    <TableCell className="text-right">{row.opened}</TableCell>
                    <TableCell className="text-right">{row.bounced}</TableCell>
                    <TableCell className="text-right">
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

      {/* Recent emails */}
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
            <p className="py-8 text-center text-muted-foreground text-sm">
              No emails sent yet. Publish a release to start sending
              notifications.
            </p>
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
                      <Badge
                        variant={STATUS_VARIANTS[email.status] ?? "secondary"}
                      >
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
