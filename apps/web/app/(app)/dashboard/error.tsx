"use client";

import { PageLayout } from "@ctrl-ui/react/ui/page-layout";
import { ErrorPage } from "@/components/ui/error-page";

interface ErrorProps {
  error: unknown;
  retry: () => void;
}

export default function DashboardError({ error, retry }: ErrorProps) {
  return (
    <PageLayout className="overflow-y-auto" scroll="none" width="full">
      <ErrorPage
        className="min-h-0 flex-1"
        description="This page didn’t load. Try again, or open another page from the sidebar."
        error={error instanceof Error ? error : undefined}
        homeHref="/dashboard"
        homeLabel="Back to dashboard"
        onRetry={retry}
      />
    </PageLayout>
  );
}
