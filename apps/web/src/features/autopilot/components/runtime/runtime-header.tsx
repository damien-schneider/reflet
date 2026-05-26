import { Badge } from "@/components/ui/badge";
import type { RuntimeState } from "@/features/autopilot/components/runtime/runtime-types";

export function RuntimeHeader({ state }: { state: RuntimeState }) {
  return (
    <section className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary">
        {state.limits.review.pendingTotal} pending review
      </Badge>
      {state.limits.dailyTasks && (
        <Badge variant="outline">
          {state.limits.dailyTasks.used}/{state.limits.dailyTasks.max} tasks
        </Badge>
      )}
      {state.limits.cost && (
        <Badge variant="outline">
          ${state.limits.cost.usedUsd.toFixed(2)} / $
          {state.limits.cost.capUsd.toFixed(2)}
        </Badge>
      )}
    </section>
  );
}
