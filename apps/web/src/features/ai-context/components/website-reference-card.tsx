"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { toast } from "@ctrl-ui/react/ui/toast";
import {
  ArrowsClockwise,
  ArrowUpRight,
  Check,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { format } from "date-fns";
import { useState } from "react";

interface WebsiteReference {
  _id: Id<"websiteReferences">;
  description?: string;
  errorMessage?: string;
  lastFetchedAt?: number;
  status: "pending" | "fetching" | "success" | "error";
  title?: string;
  url: string;
}

interface WebsiteReferenceCardProps {
  isAdmin: boolean;
  reference: WebsiteReference;
}

export function WebsiteReferenceCard({
  reference,
  isAdmin,
}: WebsiteReferenceCardProps) {
  const name = reference.title || new URL(reference.url).hostname;

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <a
              className="inline-flex min-w-0 items-center gap-1 font-medium text-label underline-offset-4 hover:underline"
              href={reference.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span className="truncate">{name}</span>
              <ArrowUpRight aria-hidden className="size-3 shrink-0" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <StatusBadge status={reference.status} />
          </div>

          <p className="truncate text-caption text-muted-foreground">
            {reference.url}
          </p>

          {reference.status === "error" && reference.errorMessage ? (
            <p className="text-caption text-destructive-text">
              {reference.errorMessage}
            </p>
          ) : null}

          {reference.description ? (
            <p className="line-clamp-2 text-pretty text-body text-muted-foreground">
              {reference.description}
            </p>
          ) : null}

          {reference.lastFetchedAt && reference.status === "success" ? (
            <p className="text-caption text-muted-foreground tabular-nums">
              Last fetched{" "}
              <time dateTime={new Date(reference.lastFetchedAt).toISOString()}>
                {format(reference.lastFetchedAt, "PP")}
              </time>
            </p>
          ) : null}
        </div>

        {isAdmin ? (
          <ReferenceActions name={name} reference={reference} />
        ) : null}
      </CardContent>
    </Card>
  );
}

function ReferenceActions({
  name,
  reference,
}: {
  name: string;
  reference: WebsiteReference;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const refreshReference = useMutation(
    api.integrations.website_references.refresh
  );
  const removeReference = useMutation(
    api.integrations.website_references.remove
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshReference({ id: reference._id });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn’t refresh the website"
      );
    }
    setIsRefreshing(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await removeReference({ id: reference._id });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn’t remove the website"
      );
    }
    setIsDeleting(false);
  };

  const isFetching =
    isRefreshing ||
    reference.status === "pending" ||
    reference.status === "fetching";

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        aria-label={`Refresh ${name}`}
        disabled={isFetching}
        iconOnly
        onClick={handleRefresh}
        size="sm"
        variant="ghost"
      >
        {isFetching ? (
          <Spinner aria-hidden data-icon="inline-start" size="xs" />
        ) : (
          <ArrowsClockwise aria-hidden />
        )}
      </Button>
      <Button
        aria-label={`Remove ${name}`}
        disabled={isDeleting}
        iconOnly
        onClick={handleDelete}
        size="sm"
        tone="danger"
        variant="ghost"
      >
        {isDeleting ? (
          <Spinner aria-hidden data-icon="inline-start" size="xs" />
        ) : (
          <Trash aria-hidden />
        )}
      </Button>
    </div>
  );
}

function StatusBadge({ status }: { status: WebsiteReference["status"] }) {
  if (status === "success") {
    return (
      <Badge color="green" size="sm">
        <Check aria-hidden />
        Fetched
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge color="red" size="sm">
        <Warning aria-hidden />
        Failed
      </Badge>
    );
  }
  return (
    <Badge color="neutral" size="sm">
      <Spinner aria-hidden size="xs" />
      Fetching…
    </Badge>
  );
}
