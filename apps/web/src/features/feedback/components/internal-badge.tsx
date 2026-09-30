import { Badge } from "@ctrl-ui/react/ui/badge";
import { EyeSlash } from "@phosphor-icons/react";

export function InternalBadge({ className }: { className?: string }) {
  return (
    <Badge
      className={className}
      size="sm"
      title="Only visible to your team"
      variant="outline"
    >
      <EyeSlash aria-hidden />
      Internal
      <span className="sr-only"> (only visible to your team)</span>
    </Badge>
  );
}
