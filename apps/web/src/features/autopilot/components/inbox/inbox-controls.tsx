import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { H2 } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import type { InboxTab } from "./types";

interface InboxHeaderProps {
  countsTotal: number | undefined;
  onBulkApprove: () => void;
  pendingCount: number;
}

interface InboxFiltersProps {
  activeTab: InboxTab;
  countsTotal: number | undefined;
  onSearchChange: (query: string) => void;
  onTabChange: (tab: InboxTab) => void;
  searchQuery: string;
}

export function InboxHeader({
  countsTotal,
  onBulkApprove,
  pendingCount,
}: InboxHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <H2 variant="card">Inbox</H2>
        {countsTotal !== undefined && countsTotal > 0 && (
          <Badge variant="secondary">{countsTotal} pending</Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        {pendingCount > 1 && (
          <Button onClick={onBulkApprove} size="sm" variant="outline">
            Approve All ({pendingCount})
          </Button>
        )}
      </div>
    </div>
  );
}

export function InboxFilters({
  activeTab,
  countsTotal,
  onSearchChange,
  onTabChange,
  searchQuery,
}: InboxFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex rounded-md border">
        <Button
          className={cn(
            "rounded-none rounded-l-md",
            activeTab === "pending" && "bg-muted"
          )}
          onClick={() => onTabChange("pending")}
          size="sm"
          variant="ghost"
        >
          Pending
          {countsTotal !== undefined && countsTotal > 0 && (
            <Badge className="ml-1.5" variant="secondary">
              {countsTotal}
            </Badge>
          )}
        </Button>
        <Button
          className={cn(
            "rounded-none rounded-r-md",
            activeTab === "resolved" && "bg-muted"
          )}
          onClick={() => onTabChange("resolved")}
          size="sm"
          variant="ghost"
        >
          Resolved
        </Button>
      </div>
      <Input
        className="max-w-xs"
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search inbox..."
        type="search"
        value={searchQuery}
      />
    </div>
  );
}
