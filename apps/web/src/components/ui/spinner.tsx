import { Loading03Icon } from "@hugeicons/core-free-icons";
import type { HugeiconsProps } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";

function Spinner({
  className,
  strokeWidth = 2,
  ...props
}: Omit<HugeiconsProps, "icon">) {
  return (
    <HugeiconsIcon
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      icon={Loading03Icon}
      role="status"
      strokeWidth={strokeWidth}
      {...props}
    />
  );
}

export { Spinner };
