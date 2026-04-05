"use client";

import { IconArrowRight, IconSparkles } from "@tabler/icons-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function UpgradeBanner({
  billingUrl,
  tier,
}: {
  billingUrl: string;
  tier: "free" | "pro";
}) {
  if (tier === "pro") {
    return null;
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/[0.03] px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <IconSparkles className="size-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm">
            Upgrade to Pro for full Autopilot
          </p>
          <p className="text-muted-foreground text-xs">
            Unlock higher limits, all agents, and priority execution.
          </p>
        </div>
      </div>
      <Button render={<Link href={billingUrl} />} size="sm">
        Upgrade
        <IconArrowRight className="ml-1 size-3.5" />
      </Button>
    </div>
  );
}
