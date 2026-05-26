"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { RuntimeActions } from "@/features/autopilot/components/runtime/runtime-actions";
import { RuntimeHeader } from "@/features/autopilot/components/runtime/runtime-header";
import { RuntimeRoles } from "@/features/autopilot/components/runtime/runtime-roles";
import type {
  RuntimeAction,
  RuntimeState,
} from "@/features/autopilot/components/runtime/runtime-types";

interface ChainRuntimeViewProps {
  baseUrl: string;
  isAdmin: boolean;
  organizationId: Id<"organizations">;
}

const SKELETON_KEYS = [
  "runtime-skeleton-role",
  "runtime-skeleton-action",
  "runtime-skeleton-blocker",
] as const;

function ChainRuntimeSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 rounded-lg" />
      <div className="grid gap-3 lg:grid-cols-2">
        {SKELETON_KEYS.map((key) => (
          <Skeleton className="h-40 rounded-lg" key={key} />
        ))}
      </div>
    </div>
  );
}

export function ChainRuntimeView({
  baseUrl,
  isAdmin,
  organizationId,
}: ChainRuntimeViewProps) {
  const state = useQuery(api.autopilot.runtime.queries.getRuntimeState, {
    baseUrl,
    organizationId,
  });
  const retryExecution = useMutation(
    api.autopilot.runtime.mutations.retryExecution
  );

  if (!state) {
    return <ChainRuntimeSkeleton />;
  }

  const runtimeState: RuntimeState = state;

  const handleRetry = async (action: RuntimeAction) => {
    try {
      await retryExecution({ executionId: action.id });
      toast.success("Execution queued for retry");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Retry failed");
    }
  };

  return (
    <div className="space-y-6">
      <RuntimeHeader state={runtimeState} />
      <RuntimeRoles roles={runtimeState.roles} />
      <RuntimeActions
        actions={runtimeState.actions}
        isAdmin={isAdmin}
        onRetry={handleRetry}
      />
    </div>
  );
}
