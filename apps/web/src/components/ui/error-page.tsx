"use client";

import { ArrowClockwise, House, Warning } from "@phosphor-icons/react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "./button";

interface ErrorPageProps {
  title?: string;
  description?: string;
  error?: Error | null;
  onRetry?: () => void;
  retryLabel?: string;
  showHomeLink?: boolean;
  showError?: boolean;
  className?: string;
}

export function ErrorPage({
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again or return to the home page.",
  error,
  onRetry,
  retryLabel = "Try again",
  showHomeLink = true,
  showError = false,
  className,
}: ErrorPageProps) {
  return (
    <div
      className={cn(
        "flex min-h-[50vh] flex-col items-center justify-center p-8 text-center",
        className
      )}
      role="alert"
    >
      <div className="rounded-full bg-destructive/10 p-4">
        <Warning className="size-12 text-destructive" weight="fill" />
      </div>

      <div className="mt-6 space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="max-w-md text-muted-foreground">{description}</p>
      </div>

      {showError && error?.message && (
        <code className="mt-4 max-w-lg overflow-auto rounded-md bg-muted px-4 py-2 text-sm text-muted-foreground">
          {error.message}
        </code>
      )}

      <div className="mt-6 flex items-center gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <ArrowClockwise className="size-4" data-icon="inline-start" />
            {retryLabel}
          </Button>
        )}

        {showHomeLink && (
          <Link
            className={buttonVariants({
              variant: onRetry ? "ghost" : "outline",
            })}
            href="/"
          >
            <House className="size-4" data-icon="inline-start" />
            Go home
          </Link>
        )}
      </div>
    </div>
  );
}
