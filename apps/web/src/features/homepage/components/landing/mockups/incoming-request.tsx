"use client";

import { ArrowUp, Sparkle } from "@phosphor-icons/react";
import { motion } from "motion/react";

import { EASE_OUT_EXPO } from "../../../lib/motion";

interface IncomingRequestProps {
  merging: boolean;
  title: string;
}

export default function IncomingRequest({
  merging,
  title,
}: IncomingRequestProps) {
  return (
    <motion.div
      animate={
        merging
          ? { height: 0, opacity: 0, scale: 0.96, y: 14 }
          : { height: "auto", opacity: 1, scale: 1, y: 0 }
      }
      className="relative overflow-hidden border-border/70 border-b bg-olive-600/6 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-olive-600 dark:bg-olive-400/8 dark:before:bg-olive-400"
      initial={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
    >
      <div className="flex items-start gap-3.5 px-5 py-2">
        <span className="mt-0.5 flex h-11 w-9.5 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-olive-600/40 bg-olive-600/10 text-olive-600 dark:border-olive-400/40 dark:bg-olive-400/10 dark:text-olive-400">
          <ArrowUp size={11} weight="bold" />
          <span className="font-bold text-[11px] tabular-nums leading-none">
            1
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[13px] text-foreground leading-snug">
            {title}
          </p>
          <div className="mt-0.5 mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="flex size-4 items-center justify-center rounded-full bg-olive-600 font-bold text-[11px] text-olive-50 dark:bg-olive-400 dark:text-olive-950">
              Y
            </span>
            You
            <span aria-hidden="true" className="text-muted-foreground/70">
              ·
            </span>
            just now
          </div>
          <span className="inline-flex items-center gap-1.5 font-medium text-[11px] text-olive-700 dark:text-olive-300">
            <Sparkle size={9} weight="fill" />
            Reflet is reading it
          </span>
        </div>
      </div>
    </motion.div>
  );
}
