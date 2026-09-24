import { Badge } from "@ctrl-ui/react/ui/badge";
import { EyeSlash } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function InternalBadge({ className }: { className?: string }) {
  return (
    <Badge
      className={cn("text-xs", className)}
      title="Only visible to your team"
      variant="outline"
    >
      <EyeSlash aria-hidden className="mr-1 h-3 w-3" />
      Internal
      <span className="sr-only"> (only visible to your team)</span>
    </Badge>
  );
}
