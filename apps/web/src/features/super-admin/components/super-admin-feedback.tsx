"use client";

import { Badge, type BadgeProps } from "@ctrl-ui/react/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ctrl-ui/react/ui/table";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AdminDate,
  EmptyTableRow,
  SuperAdminTableSkeleton,
} from "./super-admin-table";

const FEEDBACK_STATUS: Record<
  string,
  { color: BadgeProps["color"]; label: string }
> = {
  closed: { color: "neutral", label: "Closed" },
  completed: { color: "green", label: "Completed" },
  in_progress: { color: "orange", label: "In progress" },
  open: { color: "blue", label: "Open" },
  planned: { color: "purple", label: "Planned" },
  under_review: { color: "yellow", label: "Under review" },
};

const TOP_FEEDBACK_LIMIT = 20;

export function SuperAdminFeedback() {
  const topFeedback = useQuery(
    api.organizations.super_admin_metrics.getTopVotedFeedback,
    { limit: TOP_FEEDBACK_LIMIT }
  );

  if (topFeedback === undefined) {
    return <SuperAdminTableSkeleton label="Loading feedback…" />;
  }

  return (
    <section aria-labelledby="top-voted-feedback" className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-heading-4" id="top-voted-feedback">
          Top voted feedback
        </h2>
        <p className="text-body text-muted-foreground">
          The {TOP_FEEDBACK_LIMIT} most upvoted items across all organizations.
        </p>
      </div>

      <div className="rounded-(--radius-panel) border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead className="text-right">Votes</TableHead>
              <TableHead className="text-right">Comments</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topFeedback.length === 0 ? (
              <EmptyTableRow colSpan={6} message="No feedback yet." />
            ) : (
              topFeedback.map((fb) => {
                const statusMeta = FEEDBACK_STATUS[fb.status] ?? {
                  color: "neutral",
                  label: fb.status,
                };
                return (
                  <TableRow key={fb._id}>
                    <TableCell
                      className="max-w-75 truncate font-medium"
                      title={fb.title}
                    >
                      {fb.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {fb.organizationName}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fb.voteCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fb.commentCount}
                    </TableCell>
                    <TableCell>
                      <Badge color={statusMeta.color}>{statusMeta.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      <AdminDate timestamp={fb.createdAt} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
