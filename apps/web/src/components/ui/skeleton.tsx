import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("bg-muted rounded-md animate-pulse", className)}
      data-slot="skeleton"
      {...props}
    />
  );
}

export { Skeleton };
