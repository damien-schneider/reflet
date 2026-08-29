"use client";

import { ChatCircleDots } from "@phosphor-icons/react";

import { RefletMark } from "@/components/reflet-mark";

export default function SdkResult() {
  return (
    <div className="flex select-none items-center gap-3">
      <span className="hidden font-medium text-[11px] text-muted-foreground sm:inline">
        Renders
      </span>
      <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 font-medium text-[11px] text-foreground shadow-[0_1px_2px_rgba(20,18,11,0.06)] dark:shadow-[0_2px_6px_-2px_rgba(0,0,0,0.8)]">
        <RefletMark className="size-3.5" />
        Feedback
        <ChatCircleDots className="text-muted-foreground" size={11} />
      </span>
    </div>
  );
}
