"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconCode,
  IconTarget,
  IconTrendingUp,
  IconUsers,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { useAtom } from "jotai";
import { motion } from "motion/react";
import { type ComponentType, useState } from "react";

import {
  ChainChatToggleButton,
  ChainExpandedPanel,
  ChainLiveSheen,
  ChainStatusButton,
  EASE_OUT_EXPO,
} from "@/features/autopilot/components/chain-status/live-bar-parts";
import { cn } from "@/lib/utils";
import { ceoChatOpenAtom } from "@/store/ui";

type Owner = "cto" | "pm" | "growth" | "sales";

const OWNER_ICONS: Record<Owner, ComponentType<{ className?: string }>> = {
  cto: IconCode,
  pm: IconUsers,
  growth: IconTrendingUp,
  sales: IconTarget,
};

const isOwner = (s: string): s is Owner =>
  s === "cto" || s === "pm" || s === "growth" || s === "sales";

function resolveOwner(ownerCandidate: string | undefined): Owner {
  if (ownerCandidate && isOwner(ownerCandidate)) {
    return ownerCandidate;
  }
  return "cto";
}

function resolveHeadline({
  actionableLabel,
  isLive,
  liveLabel,
}: {
  actionableLabel: string | undefined;
  isLive: boolean;
  liveLabel: string | undefined;
}): string {
  if (isLive) {
    return liveLabel ?? "Working";
  }
  if (actionableLabel) {
    return `Next: ${actionableLabel}`;
  }
  return "Chain idle";
}

function resolveSubline({
  actionableOwner,
  gatedByOpenTasks,
  isLive,
  liveMessage,
  openTaskCount,
  wakeThreshold,
}: {
  actionableOwner: string | undefined;
  gatedByOpenTasks: boolean;
  isLive: boolean;
  liveMessage: string | null;
  openTaskCount: number;
  wakeThreshold: number;
}): string {
  if (isLive) {
    return liveMessage ?? "";
  }
  if (gatedByOpenTasks) {
    return `Gated · ${openTaskCount}/${wakeThreshold} open tasks`;
  }
  if (actionableOwner) {
    return `Ready · ${actionableOwner.toUpperCase()}`;
  }
  return "All artifacts published";
}

function resolveBadgeLabel({
  hasActionable,
  isLive,
}: {
  hasActionable: boolean;
  isLive: boolean;
}): string {
  if (isLive) {
    return "Live";
  }
  if (hasActionable) {
    return "Idle";
  }
  return "Done";
}

interface ChainLiveBarProps {
  baseUrl: string;
  canUseCeoChat: boolean;
  organizationId: Id<"organizations">;
}

export function ChainLiveBar({
  baseUrl,
  organizationId,
  canUseCeoChat,
}: ChainLiveBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [isChatOpen, setIsChatOpen] = useAtom(ceoChatOpenAtom);
  const meta = useQuery(api.autopilot.queries.chain.getChainMeta, {});
  const activeWork = useQuery(api.autopilot.queries.chain.getActiveChainWork, {
    organizationId,
  });
  const overview = useQuery(api.autopilot.queries.chain.getChainOverview, {
    organizationId,
  });

  if (!(meta && activeWork && overview)) {
    return null;
  }

  const nodeMeta = activeWork.activeNode
    ? meta.nodes.find((n) => n.kind === activeWork.activeNode)
    : null;

  const actionable = overview.nodes.find((n) => n.actionable) ?? null;
  const actionableMeta = actionable
    ? meta.nodes.find((n) => n.kind === actionable.kind)
    : null;

  const isLive = Boolean(activeWork.activeNode && nodeMeta);

  const owner = resolveOwner(isLive ? nodeMeta?.owner : actionableMeta?.owner);
  const Icon = OWNER_ICONS[owner];
  const headline = resolveHeadline({
    actionableLabel: actionableMeta?.label,
    isLive,
    liveLabel: nodeMeta?.label,
  });
  const subline = resolveSubline({
    actionableOwner: actionableMeta?.owner,
    gatedByOpenTasks: overview.gatedByOpenTasks,
    isLive,
    liveMessage: activeWork.message,
    openTaskCount: overview.openTaskCount,
    wakeThreshold: overview.wakeThreshold,
  });
  const badgeLabel = resolveBadgeLabel({
    hasActionable: Boolean(actionable),
    isLive,
  });

  return (
    <motion.aside
      animate={{ opacity: 1, y: 0 }}
      aria-label="Autopilot chain status"
      className={cn(
        "fixed top-3 z-50 max-w-[min(420px,calc(100vw-1.5rem))] transition-[right] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        isChatOpen
          ? "right-3 sm:right-[calc(var(--ceo-chat-width)+1.5rem)]"
          : "right-3"
      )}
      initial={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
    >
      <motion.div
        animate={{
          boxShadow: isLive
            ? "0 8px 24px -8px rgba(16, 185, 129, 0.35)"
            : "0 8px 24px -12px rgba(0, 0, 0, 0.25)",
        }}
        className={cn(
          "relative overflow-hidden rounded-xl border border-border bg-background/95 backdrop-blur",
          isLive && "border-emerald-500/50"
        )}
        transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
      >
        <ChainLiveSheen isLive={isLive} />
        <div className="flex items-stretch">
          <ChainStatusButton
            badgeLabel={badgeLabel}
            expanded={expanded}
            headline={headline}
            Icon={Icon}
            isLive={isLive}
            onToggle={() => setExpanded((prev) => !prev)}
            subline={subline}
          />

          {canUseCeoChat && (
            <ChainChatToggleButton
              isChatOpen={isChatOpen}
              onToggle={() => setIsChatOpen((prev) => !prev)}
            />
          )}
        </div>

        <ChainExpandedPanel
          baseUrl={baseUrl}
          entries={activeWork.recent}
          expanded={expanded}
        />
      </motion.div>
    </motion.aside>
  );
}
