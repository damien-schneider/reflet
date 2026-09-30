import {
  PageBody,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";

export function SupportLoadingState() {
  return (
    <PageLayout scroll="page" width="prose">
      <PageHeader>
        <PageTitle>Contact Support</PageTitle>
        <Skeleton className="h-4 w-64 max-w-full" />
      </PageHeader>
      <PageBody>
        <div className="flex flex-col gap-4" role="status">
          <span className="sr-only">Loading support…</span>
          <Skeleton aria-hidden className="h-10 w-full" />
          <Skeleton aria-hidden className="h-32 w-full" />
          <Skeleton aria-hidden className="h-9 w-24 self-end" />
        </div>
      </PageBody>
    </PageLayout>
  );
}
