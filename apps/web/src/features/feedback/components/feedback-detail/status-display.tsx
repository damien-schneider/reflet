import { CaretDown } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toId } from "@/lib/convex-helpers";
import { getTagSwatchClass } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

interface StatusDisplayProps {
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
            className="flex cursor-pointer select-none items-center"
            render={<button type="button" />}
          >
            <Badge
              className="h-8 rounded-full px-3 font-normal text-xs"
              color={currentStatus.color}
            >
              {currentStatus.name}
              <CaretDown className="h-3 w-3 opacity-70" />
            </Badge>
          </DropdownMenuTrigger>
        ) : (
          <DropdownMenuTrigger
            className="flex h-8 w-auto cursor-pointer select-none items-center gap-1.5 rounded-full border border-input border-dashed bg-transparent px-3 text-sm transition-colors"
            render={<button type="button" />}
          >
            <span className="text-muted-foreground text-xs">Status</span>
            <CaretDown className="h-3.5 w-3.5 text-muted-foreground" />
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
                <div
                  className={cn(
                    "h-3 w-3 shrink-0 rounded-full border",
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
      <Badge
        className="rounded-full px-2 py-0.5 font-normal text-xs"
        color={currentStatus.color}
      >
        {currentStatus.name}
      </Badge>
    );
  }

  return null;
}
