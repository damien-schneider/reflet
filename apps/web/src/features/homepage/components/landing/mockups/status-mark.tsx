import { cn } from "@/lib/utils";

import type { BoardItem } from "../landing-data";

type Status = BoardItem["status"];

const STATUS_DOT: Record<Status, string> = {
  "In progress": "bg-olive-600 dark:bg-olive-400",
  Planned: "border border-olive-600/60 dark:border-olive-400/60",
  Shipped: "bg-muted-foreground/35",
  "Under review": "bg-olive-600/40 dark:bg-olive-400/40",
};

export default function StatusMark({ status }: { status: Status }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-[11px] text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
      {status}
    </span>
  );
}
