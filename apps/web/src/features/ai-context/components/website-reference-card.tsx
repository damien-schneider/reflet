"use client";

import {
  ArrowsClockwise,
  ArrowUpRight,
  Check,
  Spinner,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WebsiteReference {
  _id: Id<"websiteReferences">;
  url: string;
  title?: string;
  description?: string;
  status: "pending" | "fetching" | "success" | "error";
  errorMessage?: string;
  lastFetchedAt?: number;
}

interface WebsiteReferenceCardProps {
  reference: WebsiteReference;
  isAdmin: boolean;
}

export function WebsiteReferenceCard({
  reference,
  isAdmin,
}: WebsiteReferenceCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const refreshReference = useMutation(api.website_references.refresh);
  const removeReference = useMutation(api.website_references.remove);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshReference({ id: reference._id });
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await removeReference({ id: reference._id });
    } finally {
      setIsDeleting(false);
    }
  };

  const isLoading =
    reference.status === "pending" || reference.status === "fetching";

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <a
                className="flex items-center gap-1 font-medium text-sm hover:text-olive-600 hover:underline"
                href={reference.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {reference.title || new URL(reference.url).hostname}
                <ArrowUpRight className="h-3 w-3" />
              </a>
              <StatusBadge
                errorMessage={reference.errorMessage}
                status={reference.status}
              />
            </div>

            <p className="mt-1 truncate text-muted-foreground text-xs">
              {reference.url}
            </p>

            {reference.description && (
              <p className="mt-2 line-clamp-2 text-muted-foreground text-sm">
                {reference.description}
              </p>
            )}

            {reference.lastFetchedAt && reference.status === "success" && (
              <p className="mt-2 text-muted-foreground/60 text-xs">
                Last fetched:{" "}
                {new Date(reference.lastFetchedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {isAdmin && (
            <div className="flex items-center gap-1">
              <Button
                disabled={isLoading || isRefreshing}
                onClick={handleRefresh}
                size="icon-sm"
                title="Refresh"
                variant="ghost"
              >
                <ArrowsClockwise
                  className={cn(
                    "h-4 w-4",
                    (isRefreshing || isLoading) && "animate-spin"
                  )}
                />
              </Button>
              <Button
                disabled={isDeleting}
                onClick={handleDelete}
                size="icon-sm"
                title="Delete"
                variant="ghost"
              >
                {isDeleting ? (
                  <Spinner className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash className="h-4 w-4 text-destructive" />
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({
  status,
  errorMessage,
}: {
  status: string;
  errorMessage?: string;
}) {
  switch (status) {
    case "pending":
    case "fetching":
      return (
        <Badge className="text-xs" variant="secondary">
          <Spinner className="mr-1 h-3 w-3 animate-spin" />
          Fetching...
        </Badge>
      );
    case "success":
      return (
        <Badge className="bg-olive-100 text-olive-700 text-xs dark:bg-olive-900 dark:text-olive-300">
          <Check className="mr-1 h-3 w-3" />
          Success
        </Badge>
      );
    case "error":
      return (
        <Badge className="text-xs" title={errorMessage} variant="destructive">
          <Warning className="mr-1 h-3 w-3" />
          Error
        </Badge>
      );
    default:
      return null;
  }
}
