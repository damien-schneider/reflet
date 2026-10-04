import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { SectionPanel } from "@/features/dashboard/components/section-panel";

export function ConversationRowsSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-2 p-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

export function InboxPanelSkeleton() {
  return (
    <SectionPanel title="Inbox">
      <div aria-hidden className="flex flex-col gap-2 px-3 pb-3">
        <Skeleton className="h-control-sm w-full" />
        <Skeleton className="h-control-sm w-full" />
      </div>
      <ConversationRowsSkeleton />
    </SectionPanel>
  );
}
