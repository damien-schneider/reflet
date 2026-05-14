import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface AgentWorkStreamPanelStream {
  content: string;
  error?: string;
  model?: string;
  status: "streaming" | "completed" | "failed";
  title: string;
  updatedAt: number;
}

const STATUS_LABELS: Record<AgentWorkStreamPanelStream["status"], string> = {
  streaming: "Streaming",
  completed: "Last output",
  failed: "Failed",
};

const STATUS_STYLES: Record<
  AgentWorkStreamPanelStream["status"],
  { badge: string; dot: string }
> = {
  streaming: {
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  completed: {
    badge: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/40",
  },
  failed: {
    badge: "bg-red-500/10 text-red-700 dark:text-red-300",
    dot: "bg-red-500",
  },
};

export function AgentWorkStreamPanel({
  stream,
}: {
  stream: AgentWorkStreamPanelStream;
}) {
  const styles = STATUS_STYLES[stream.status];
  const content = stream.error ?? stream.content;

  return (
    <section
      aria-live={stream.status === "streaming" ? "polite" : undefined}
      className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("size-2 rounded-full", styles.dot)} />
            <p className="font-medium text-xs">Live work stream</p>
          </div>
          <p className="mt-1 truncate text-muted-foreground text-xs">
            {stream.title}
          </p>
        </div>
        <Badge className={cn("shrink-0", styles.badge)}>
          {STATUS_LABELS[stream.status]}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        {stream.model ? <span>{stream.model}</span> : null}
        <span suppressHydrationWarning>
          Updated{" "}
          {formatDistanceToNow(stream.updatedAt, {
            addSuffix: true,
          })}
        </span>
      </div>

      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-background/70 p-3 font-mono text-[11px] leading-relaxed">
        {content || "Waiting for the first streamed token..."}
      </pre>
    </section>
  );
}
