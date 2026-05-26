"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ArrowRightIcon, PauseCircleIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OWNER_LABELS: Record<string, string> = {
  cto: "CTO",
  pm: "PM",
  growth: "Growth",
  sales: "Sales",
};

interface ChainBlockersBannerProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export function ChainBlockersBanner({
  organizationId,
  orgSlug,
}: ChainBlockersBannerProps) {
  const overview = useQuery(api.autopilot.queries.chain.getChainOverview, {
    organizationId,
  });

  if (!overview) {
    return null;
  }

  const blockedByOwner = new Map<string, number>();
  for (const node of overview.nodes) {
    if (node.roleDisabled && node.status === "missing") {
      blockedByOwner.set(node.owner, (blockedByOwner.get(node.owner) ?? 0) + 1);
    }
  }

  if (blockedByOwner.size === 0) {
    return null;
  }

  const totalBlocked = Array.from(blockedByOwner.values()).reduce(
    (sum, n) => sum + n,
    0
  );
  const ownerSummary = Array.from(blockedByOwner.entries())
    .map(([owner, count]) => `${OWNER_LABELS[owner] ?? owner} (${count})`)
    .join(", ");

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-start gap-3">
        <PauseCircleIcon className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-amber-700 text-sm dark:text-amber-300">
            {totalBlocked} node{totalBlocked > 1 ? "s" : ""} blocked by disabled
            role{blockedByOwner.size > 1 ? "s" : ""}
          </p>
          <p className="mt-0.5 text-amber-700/80 text-xs dark:text-amber-400/70">
            Enable {ownerSummary} in Autopilot Settings to unblock the chain.
          </p>
        </div>
        <Link
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "shrink-0 gap-1 border-amber-500/30 text-amber-700 text-xs hover:bg-amber-500/10 dark:text-amber-300"
          )}
          href={`/dashboard/${orgSlug}/autopilot/settings`}
        >
          Open Settings
          <ArrowRightIcon className="size-3" />
        </Link>
      </div>
    </div>
  );
}
