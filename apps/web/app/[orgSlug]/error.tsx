"use client";

import { ErrorPage } from "@/components/ui/error-page";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function OrgPageError({ error, reset }: ErrorProps) {
  return (
    <ErrorPage
      description="We encountered an error loading this page. Please try again."
      error={error}
      onRetry={reset}
      showError={process.env.NODE_ENV === "development"}
      title="Page error"
    />
  );
}
