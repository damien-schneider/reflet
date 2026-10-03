"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Button } from "@ctrl-ui/react/ui/button";
import { ArrowClockwise, Warning } from "@phosphor-icons/react";
import { cva, type VariantProps } from "class-variance-authority";

const errorDisplayVariants = cva(
  "flex flex-col items-center justify-center text-center",
  {
    defaultVariants: {
      size: "md",
    },
    variants: {
      size: {
        lg: "gap-4 p-8",
        md: "gap-3 p-6",
        sm: "gap-2 p-4",
      },
    },
  }
);

const iconVariants = cva("text-destructive-text", {
  defaultVariants: {
    size: "md",
  },
  variants: {
    size: {
      lg: "size-12",
      md: "size-8",
      sm: "size-6",
    },
  },
});

const titleVariants = cva("font-medium text-foreground", {
  defaultVariants: {
    size: "md",
  },
  variants: {
    size: {
      lg: "text-lg",
      md: "text-base",
      sm: "text-sm",
    },
  },
});

const descriptionVariants = cva("text-muted-foreground", {
  defaultVariants: {
    size: "md",
  },
  variants: {
    size: {
      lg: "text-sm",
      md: "text-sm",
      sm: "text-xs",
    },
  },
});

interface ErrorDisplayProps extends VariantProps<typeof errorDisplayVariants> {
  className?: string;
  description?: string;
  error?: Error | null;
  onRetry?: () => void;
  retryLabel?: string;
  showError?: boolean;
  title?: string;
}

export function ErrorDisplay({
  title = "Something went wrong",
  description = "This didn’t load. Try again in a moment.",
  error,
  onRetry,
  retryLabel = "Try again",
  showError = false,
  size,
  className,
}: ErrorDisplayProps) {
  return (
    <div className={cn(errorDisplayVariants({ size }), className)} role="alert">
      <div aria-hidden="true" className="rounded-full bg-destructive/10 p-3">
        <Warning className={iconVariants({ size })} weight="fill" />
      </div>

      <div className="space-y-1">
        <h3 className={cn(titleVariants({ size }), "text-balance")}>{title}</h3>
        <p className={cn(descriptionVariants({ size }), "text-pretty")}>
          {description}
        </p>
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
          size={size === "sm" ? "xs" : "sm"}
          variant="surface"
        >
          <ArrowClockwise
            aria-hidden="true"
            className="size-4"
            data-icon="inline-start"
          />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
