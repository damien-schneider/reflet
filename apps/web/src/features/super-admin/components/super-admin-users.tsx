"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ctrl-ui/react/ui/table";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  AdminDate,
  EmptyTableRow,
  SuperAdminFilter,
  SuperAdminTableSkeleton,
} from "./super-admin-table";

const PAGE_SIZE = 20;

interface UsersResult {
  items: Array<{
    id: string;
    name: string;
    email: string;
    image: string | null;
    organizationCount: number;
    joinedAt: number;
  }>;
  totalCount: number;
  totalPages: number;
}

export function SuperAdminUsers() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const result = useQuery(api.organizations.super_admin.listUsers, {
    page,
    pageSize: PAGE_SIZE,
  });

  // Keeps the previous page visible while the next one loads, instead of a skeleton flash.
  const [cachedResult, setCachedResult] = useState<UsersResult | null>(null);
  if (result !== undefined && result !== cachedResult) {
    setCachedResult(result);
  }

  const displayResult = result ?? cachedResult;
  const isPageTransition = result === undefined && cachedResult !== null;

  if (!displayResult) {
    return <SuperAdminTableSkeleton label="Loading users…" />;
  }

  const { totalCount, totalPages } = displayResult;
  const query = search.toLowerCase();
  const users = query
    ? displayResult.items.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
      )
    : displayResult.items;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <SuperAdminFilter
          label="Filter this page by name or email"
          onChange={setSearch}
          value={search}
        />
        <span className="text-caption text-muted-foreground tabular-nums">
          {totalCount.toLocaleString("en-US")}{" "}
          {totalCount === 1 ? "user" : "users"}
        </span>
      </div>

      <div
        aria-busy={isPageTransition || undefined}
        className={cn(
          "rounded-(--radius-panel) border transition-opacity duration-(--duration-fast)",
          isPageTransition && "opacity-50"
        )}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Organizations</TableHead>
              <TableHead className="text-right">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <EmptyTableRow
                colSpan={4}
                message={
                  search
                    ? "No users on this page match that filter."
                    : "No users yet."
                }
              />
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {user.organizationCount}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    <AdminDate timestamp={user.joinedAt} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <nav
          aria-label="Users pagination"
          className="flex items-center justify-between"
        >
          <span className="text-caption text-muted-foreground tabular-nums">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              disabled={page === 0 || isPageTransition}
              onClick={() => {
                setPage((p) => p - 1);
                setSearch("");
              }}
              size="sm"
              variant="surface"
            >
              <CaretLeft aria-hidden />
              Previous
            </Button>
            <Button
              disabled={page >= totalPages - 1 || isPageTransition}
              onClick={() => {
                setPage((p) => p + 1);
                setSearch("");
              }}
              size="sm"
              variant="surface"
            >
              Next
              <CaretRight aria-hidden />
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
