"use client";

import { ErrorPage } from "@/components/ui/error-page";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function OrgPageError({ error, reset }: ErrorProps) {
  return (
    <ErrorPage
      description="Check your connection and try again. If it keeps happening, come back in a few minutes."
      error={error}
      onRetry={reset}
      showError={process.env.NODE_ENV === "development"}
      title="Unable to load this page"
    />
  );
}
