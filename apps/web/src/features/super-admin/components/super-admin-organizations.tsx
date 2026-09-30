"use client";

import { Badge, type BadgeProps } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ctrl-ui/react/ui/table";
import { api } from "@reflet/backend/convex/_generated/api";
import { usePaginatedQuery } from "convex/react";
import { useState } from "react";
import {
  AdminDate,
  EmptyTableRow,
  SuperAdminFilter,
  SuperAdminTableSkeleton,
} from "./super-admin-table";

const PAGE_SIZE = 20;

const SUBSCRIPTION_STATUS: Record<
  string,
  { color: BadgeProps["color"]; label: string }
> = {
  active: { color: "blue", label: "Active" },
  canceled: { color: "neutral", label: "Canceled" },
  none: { color: "neutral", label: "None" },
  past_due: { color: "orange", label: "Past due" },
  trialing: { color: "purple", label: "Trialing" },
};

export function SuperAdminOrganizations() {
  const [search, setSearch] = useState("");

  const { results, status, loadMore } = usePaginatedQuery(
    api.organizations.super_admin.listOrganizations,
    {},
    { initialNumItems: PAGE_SIZE }
  );

  if (status === "LoadingFirstPage") {
    return <SuperAdminTableSkeleton label="Loading organizations…" />;
  }

  const query = search.toLowerCase();
  const orgs = query
    ? results.filter(
        (o) =>
          o.name.toLowerCase().includes(query) ||
          o.slug.toLowerCase().includes(query)
      )
    : results;

  return (
    <div className="space-y-4">
      <SuperAdminFilter
        label="Filter loaded organizations"
        onChange={setSearch}
        value={search}
      />

      <div className="rounded-(--radius-panel) border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Members</TableHead>
              <TableHead className="text-right">Feedback</TableHead>
              <TableHead>Public</TableHead>
              <TableHead className="text-right">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.length === 0 ? (
              <EmptyTableRow
                colSpan={8}
                message={
                  search
                    ? "No loaded organizations match that filter."
                    : "No organizations yet."
                }
              />
            ) : (
              orgs.map((org) => {
                const statusMeta = SUBSCRIPTION_STATUS[
                  org.subscriptionStatus
                ] ?? { color: "neutral", label: org.subscriptionStatus };
                return (
                  <TableRow key={org._id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {org.slug}
                    </TableCell>
                    <TableCell>
                      <Badge
                        color={
                          org.subscriptionTier === "pro" ? "green" : "neutral"
                        }
                      >
                        {org.subscriptionTier === "pro" ? "Pro" : "Free"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge color={statusMeta.color}>{statusMeta.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {org.memberCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {org.feedbackCount}
                    </TableCell>
                    <TableCell>{org.isPublic ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      <AdminDate timestamp={org.createdAt} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {status === "CanLoadMore" || status === "LoadingMore" ? (
        <div className="flex justify-center py-2">
          <Button
            disabled={status === "LoadingMore"}
            onClick={() => loadMore(PAGE_SIZE)}
            size="sm"
            variant="surface"
          >
            {status === "LoadingMore" ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
