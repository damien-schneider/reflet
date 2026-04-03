"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { IconCircleCheck, IconCircleX } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const ADAPTER_LABELS: Record<string, string> = {
  builtin: "Built-in",
  copilot: "GitHub Copilot",
  codex: "OpenAI Codex",
  claude_code: "Claude Code",
  open_swe: "OpenSWE",
  openclaw: "OpenClaw",
};

export function CredentialsStatus({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const credentials = useQuery(api.autopilot.queries.getCredentialStatus, {
    organizationId,
  });

  if (credentials === undefined) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton
            className="h-12 w-full rounded-lg"
            key={`skel-${String(i)}`}
          />
        ))}
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground text-sm">
        No credentials configured
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {credentials.map((cred) => {
        const ValidIcon = cred.isValid ? IconCircleCheck : IconCircleX;
        return (
          <div className="rounded-lg border p-3" key={cred.adapter}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ValidIcon
                  className={cn(
                    "size-4",
                    cred.isValid ? "text-green-500" : "text-red-500"
                  )}
                />
                <span className="font-medium text-sm">
                  {ADAPTER_LABELS[cred.adapter] ?? cred.adapter}
                </span>
              </div>
              <span className="text-muted-foreground text-xs">
                {cred.isValid ? "Valid" : "Invalid"}
                {cred.lastValidatedAt &&
                  ` · checked ${formatDistanceToNow(cred.lastValidatedAt, { addSuffix: true })}`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
