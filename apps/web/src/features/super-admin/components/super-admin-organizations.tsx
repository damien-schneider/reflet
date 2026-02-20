"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { usePaginatedQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 20;

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusVariant(status: string): "blue" | "orange" | "gray" {
  if (status === "active") {
    return "blue";
  }
  if (status === "past_due") {
    return "orange";
  }
  return "gray";
}

export function SuperAdminOrganizations() {
  const [search, setSearch] = useState("");

  const { results, status, loadMore } = usePaginatedQuery(
    api.super_admin.listOrganizations,
    {},
    { initialNumItems: PAGE_SIZE }
  );

  const filteredOrgs = useMemo(() => {
    if (!search) {
      return results;
    }
    const lowerSearch = search.toLowerCase();
    return results.filter(
      (o) =>
        o.name.toLowerCase().includes(lowerSearch) ||
        o.slug.toLowerCase().includes(lowerSearch)
    );
  }, [results, search]);

  if (status === "LoadingFirstPage") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative w-64">
          <MagnifyingGlass className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organizations..."
            value={search}
          />
        </div>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Feedback</TableHead>
              <TableHead>Public</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrgs.length === 0 ? (
              <TableRow>
                <TableCell
                  className="text-center text-muted-foreground"
                  colSpan={8}
                >
                  {search
                    ? "No organizations match your search."
                    : "No organizations found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredOrgs.map((org) => (
                <TableRow key={org._id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {org.slug}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        org.subscriptionTier === "pro" ? "green" : "gray"
                      }
                    >
                      {org.subscriptionTier === "pro" ? "Pro" : "Free"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(org.subscriptionStatus)}>
                      {org.subscriptionStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>{org.memberCount}</TableCell>
                  <TableCell>{org.feedbackCount}</TableCell>
                  <TableCell>{org.isPublic ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(org.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {status === "CanLoadMore" && !search && (
        <div className="flex justify-center py-2">
          <Button
            onClick={() => loadMore(PAGE_SIZE)}
            size="sm"
            variant="outline"
          >
            Load more
          </Button>
        </div>
      )}
      {status === "LoadingMore" && (
        <div className="flex justify-center py-2">
          <span className="text-muted-foreground text-sm">Loading...</span>
        </div>
      )}
    </div>
  );
}
