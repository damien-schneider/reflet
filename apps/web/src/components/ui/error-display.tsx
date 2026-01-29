"use client";

import { ArrowClockwise, Warning } from "@phosphor-icons/react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Button } from "./button";

const errorDisplayVariants = cva(
  "flex flex-col items-center justify-center text-center",
  {
    variants: {
      size: {
        sm: "gap-2 p-4",
        md: "gap-3 p-6",
        lg: "gap-4 p-8",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

const iconVariants = cva("text-destructive", {
  variants: {
    size: {
      sm: "size-6",
      md: "size-8",
      lg: "size-12",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

const titleVariants = cva("font-medium text-foreground", {
  variants: {
    size: {
      sm: "text-sm",
      md: "text-base",
      lg: "text-lg",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

const descriptionVariants = cva("text-muted-foreground", {
  variants: {
    size: {
      sm: "text-xs",
      md: "text-sm",
      lg: "text-sm",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

interface ErrorDisplayProps extends VariantProps<typeof errorDisplayVariants> {
  title?: string;
  description?: string;
  error?: Error | null;
  onRetry?: () => void;
  retryLabel?: string;
  showError?: boolean;
  className?: string;
}

export function ErrorDisplay({
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  error,
  onRetry,
  retryLabel = "Try again",
  showError = false,
  size,
  className,
}: ErrorDisplayProps) {
  return (
    <div className={cn(errorDisplayVariants({ size }), className)} role="alert">
      <div className="rounded-full bg-destructive/10 p-3">
        <Warning className={iconVariants({ size })} weight="fill" />
      </div>

      <div className="space-y-1">
        <h3 className={titleVariants({ size })}>{title}</h3>
        <p className={descriptionVariants({ size })}>{description}</p>
      </div>

      {showError && error?.message && (
        <code className="mt-2 max-w-full overflow-auto rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          {error.message}
        </code>
      )}

      {onRetry && (
        <Button
          className="mt-2"
          onClick={onRetry}
          size={size === "sm" ? "sm" : "default"}
          variant="outline"
        >
          <ArrowClockwise className="size-4" data-icon="inline-start" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
