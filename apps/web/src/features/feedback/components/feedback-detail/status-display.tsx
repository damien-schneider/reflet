import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import { CaretDown } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { TagBadge } from "@/components/tag-badge";
import { toId } from "@/lib/convex-helpers";
import { getTagSwatchClass } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

interface StatusDisplayProps {
  currentStatus:
    | { _id: Id<"organizationStatuses">; name: string; color: string }
    | undefined;
  isAdmin: boolean;
  onStatusChange: (statusId: Id<"organizationStatuses"> | null) => void;
  organizationStatuses:
    | Array<{ _id: Id<"organizationStatuses">; name: string; color: string }>
    | undefined;
  statusId?: Id<"organizationStatuses"> | null;
}

export function StatusDisplay({
  isAdmin,
  organizationStatuses,
  currentStatus,
  statusId,
  onStatusChange,
}: StatusDisplayProps) {
  if (isAdmin && organizationStatuses) {
    return (
      <DropdownMenu>
        {currentStatus ? (
          <DropdownMenuTrigger
            aria-label={`Status: ${currentStatus.name}. Change status`}
            className="max-w-full select-none"
            render={
              <TagBadge
                color={currentStatus.color}
                render={<button type="button" />}
              />
            }
          >
            <span className="truncate" title={currentStatus.name}>
              {currentStatus.name}
            </span>
            <CaretDown aria-hidden className="opacity-70" />
          </DropdownMenuTrigger>
        ) : (
          <DropdownMenuTrigger
            aria-label="Set status"
            className="select-none"
            render={
              <TagBadge render={<button type="button" />} variant="outline" />
            }
          >
            <span>Status</span>
            <CaretDown aria-hidden />
          </DropdownMenuTrigger>
        )}
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuRadioGroup
            onValueChange={(value) =>
              onStatusChange(toId("organizationStatuses", value))
            }
            value={statusId ?? ""}
          >
            {organizationStatuses.map((status) => (
              <DropdownMenuRadioItem key={status._id} value={status._id}>
                <span
                  aria-hidden
                  className={cn(
                    "size-2.5 shrink-0 rounded-full",
                    getTagSwatchClass(status.color)
                  )}
                />
                {status.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (currentStatus) {
    return (
      <TagBadge className="max-w-full" color={currentStatus.color}>
        <span className="truncate" title={currentStatus.name}>
          {currentStatus.name}
        </span>
      </TagBadge>
    );
  }

  return null;
}
