"use client";

import { ErrorPage } from "@/components/ui/error-page";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  return (
    <ErrorPage
      description="This page didn’t load. Try again, or go back to your dashboard."
      error={error}
      homeHref="/dashboard"
      homeLabel="Back to dashboard"
      onRetry={reset}
      showError={process.env.NODE_ENV === "development"}
    />
  );
}
