"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusVariant: Record<
  string,
  "blue" | "green" | "orange" | "gray" | "purple" | "red"
> = {
  open: "blue",
  under_review: "orange",
  planned: "purple",
  in_progress: "orange",
  completed: "green",
  closed: "gray",
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SuperAdminFeedback() {
  const topFeedback = useQuery(api.super_admin.getTopVotedFeedback, {
    limit: 20,
  });

  if (topFeedback === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-sm">Top Voted Feedback</h3>
        <p className="text-muted-foreground text-xs">
          Most upvoted feedback items across all organizations
        </p>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Votes</TableHead>
              <TableHead>Comments</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topFeedback.length === 0 ? (
              <TableRow>
                <TableCell
                  className="text-center text-muted-foreground"
                  colSpan={6}
                >
                  No feedback found.
                </TableCell>
              </TableRow>
            ) : (
              topFeedback.map((fb) => (
                <TableRow key={fb._id}>
                  <TableCell className="max-w-[300px] truncate font-medium">
                    {fb.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {fb.organizationName}
                  </TableCell>
                  <TableCell className="tabular-nums">{fb.voteCount}</TableCell>
                  <TableCell className="tabular-nums">
                    {fb.commentCount}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[fb.status] ?? "gray"}>
                      {fb.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(fb.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
