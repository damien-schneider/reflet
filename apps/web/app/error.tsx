"use client";

import { ErrorPage } from "@/components/ui/error-page";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: ErrorProps) {
  return (
    <ErrorPage
      description="We encountered an unexpected error. Please try again or return to the home page."
      error={error}
      onRetry={reset}
      showError={process.env.NODE_ENV === "development"}
      title="Something went wrong"
    />
  );
}
