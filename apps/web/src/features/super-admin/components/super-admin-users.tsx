"use client";

import { CaretLeft, CaretRight, MagnifyingGlass } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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

  const result = useQuery(api.super_admin.listUsers, {
    page,
    pageSize: PAGE_SIZE,
  });

  // Cache previous result to avoid full skeleton flash on page change
  // Uses render-time state update pattern instead of useEffect
  const [cachedResult, setCachedResult] = useState<UsersResult | null>(null);
  if (result !== undefined && result !== cachedResult) {
    setCachedResult(result);
  }

  const displayResult = result ?? cachedResult;
  const isLoading = result === undefined;
  const isPageTransition = isLoading && cachedResult !== null;

  const users = displayResult?.items;
  const totalCount = displayResult?.totalCount ?? 0;
  const totalPages = displayResult?.totalPages ?? 1;

  const filteredUsers = useMemo(() => {
    if (!users) {
      return [];
    }
    if (!search) {
      return users;
    }
    const lowerSearch = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(lowerSearch) ||
        u.email.toLowerCase().includes(lowerSearch)
    );
  }, [users, search]);

  // First load — no cached data at all
  if (isLoading && !displayResult) {
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search users..."
            value={search}
          />
        </div>
        <span className="text-muted-foreground text-xs">
          {totalCount} users total
        </span>
      </div>

      <div
        className={cn(
          "rounded-xl border transition-opacity",
          isPageTransition && "opacity-50"
        )}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Organizations</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell
                  className="text-center text-muted-foreground"
                  colSpan={4}
                >
                  {search ? "No users match your search." : "No users found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>{user.organizationCount}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.joinedAt ? formatDate(user.joinedAt) : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && !search && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              disabled={page === 0 || isPageTransition}
              onClick={() => setPage((p) => p - 1)}
              size="sm"
              variant="outline"
            >
              <CaretLeft className="size-4" />
              Previous
            </Button>
            <Button
              disabled={page >= totalPages - 1 || isPageTransition}
              onClick={() => setPage((p) => p + 1)}
              size="sm"
              variant="outline"
            >
              Next
              <CaretRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
