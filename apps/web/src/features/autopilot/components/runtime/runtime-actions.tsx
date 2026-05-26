import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatRelativeTime,
  roleSkillLabel,
} from "@/features/autopilot/components/runtime/runtime-formatting";
import type { RuntimeAction } from "@/features/autopilot/components/runtime/runtime-types";

export function RuntimeActions({
  actions,
  isAdmin,
  onRetry,
}: {
  actions: RuntimeAction[];
  isAdmin: boolean;
  onRetry: (action: RuntimeAction) => void;
}) {
  const attentionActions = actions.filter(
    (action) => action.status === "failed" || action.status === "blocked"
  );

  if (attentionActions.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h3 className="font-semibold">Attention required</h3>
      <div className="space-y-2">
        {attentionActions.map((action) => (
          <div
            className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 md:flex-row md:items-center md:justify-between"
            key={action.id}
          >
            <div className="flex min-w-0 items-start gap-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="min-w-0">
                <p className="truncate font-medium text-sm">{action.title}</p>
                <p className="text-muted-foreground text-xs">
                  {roleSkillLabel(action.role)} · {action.triggerReason} ·{" "}
                  {formatRelativeTime(action.startedAt)}
                </p>
                {action.errorMessage && (
                  <p className="mt-1 text-destructive text-sm">
                    {action.errorMessage}
                  </p>
                )}
              </div>
            </div>
            {isAdmin && (
              <Button
                aria-label={`Retry ${action.title}`}
                onClick={() => onRetry(action)}
                size="sm"
                variant="outline"
              >
                <RotateCcw className="size-4" />
                Retry
              </Button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
