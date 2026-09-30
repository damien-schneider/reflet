"use client";

import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { ArrowClockwise, House, Warning } from "@phosphor-icons/react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ErrorPageProps {
  className?: string;
  description?: string;
  error?: (Error & { digest?: string }) | null;
  homeHref?: string;
  homeLabel?: string;
  onRetry?: () => void;
  retryLabel?: string;
  showError?: boolean;
  title?: string;
}

export function ErrorPage({
  title = "Something went wrong",
  description = "This page didn’t load. Try again, or go back to the home page.",
  error,
  onRetry,
  retryLabel = "Try again",
  homeHref = "/",
  homeLabel = "Go home",
  showError = false,
  className,
}: ErrorPageProps) {
  return (
    <div
      className={cn(
        "flex min-h-[50vh] items-center justify-center p-8",
        className
      )}
      role="alert"
    >
      <Empty>
        <EmptyHeader>
          <EmptyMedia className="text-destructive-text">
            <Warning weight="fill" />
          </EmptyMedia>
          <EmptyTitle>
            <h1 className="text-balance">{title}</h1>
          </EmptyTitle>
          <EmptyDescription className="text-pretty">
            {description}
          </EmptyDescription>
        </EmptyHeader>

        {showError && error?.message ? (
          <code className="max-w-lg overflow-auto rounded-md bg-muted px-4 py-2 text-muted-foreground text-sm">
            {error.message}
          </code>
        ) : null}

        <EmptyContent>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {onRetry ? (
              <Button onClick={onRetry} tone="primary" variant="solid">
                <ArrowClockwise
                  aria-hidden="true"
                  className="size-4"
                  data-icon="inline-start"
                />
                {retryLabel}
              </Button>
            ) : null}
            <ButtonLink
              render={<Link href={homeHref} />}
              variant={onRetry ? "ghost" : "surface"}
            >
              <House
                aria-hidden="true"
                className="size-4"
                data-icon="inline-start"
              />
              {homeLabel}
            </ButtonLink>
          </div>
          {error?.digest ? (
            <p className="text-caption text-muted-foreground">
              Error reference:{" "}
              <span className="select-all font-mono tabular-nums">
                {error.digest}
              </span>
            </p>
          ) : null}
        </EmptyContent>
      </Empty>
    </div>
  );
}
