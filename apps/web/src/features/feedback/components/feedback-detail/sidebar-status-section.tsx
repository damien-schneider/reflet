"use client";

import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTagDotColor } from "@/lib/tag-colors";

interface SidebarStatusSectionProps {
  isAdmin: boolean;
  organizationStatuses:
    | Array<{ _id: Id<"organizationStatuses">; name: string; color: string }>
    | undefined;
  currentStatus:
    | { _id: Id<"organizationStatuses">; name: string; color: string }
    | undefined;
  statusId?: Id<"organizationStatuses"> | null;
  onStatusChange: (statusId: Id<"organizationStatuses"> | null) => void;
}

export function SidebarStatusSection({
  isAdmin,
  organizationStatuses,
  currentStatus,
  statusId,
  onStatusChange,
}: SidebarStatusSectionProps) {
  if (isAdmin && organizationStatuses) {
    return (
      <Select
        onValueChange={(val) =>
          onStatusChange(val as Id<"organizationStatuses">)
        }
        value={statusId || undefined}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Set status">
            {currentStatus && (
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: getTagDotColor(currentStatus.color),
                  }}
                />
                {currentStatus.name}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {organizationStatuses.map((status) => (
            <SelectItem key={status._id} value={status._id}>
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: getTagDotColor(status.color) }}
                />
                {status.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (currentStatus) {
    return (
      <Badge className="px-3 py-1" color={currentStatus.color}>
        {currentStatus.name}
      </Badge>
    );
  }

  return <span className="text-muted-foreground text-sm">No status</span>;
}
