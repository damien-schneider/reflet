"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { EASE_OUT_EXPO } from "@/features/homepage/lib/motion";

import { LoopSpacerLayer } from "./loop-card";
import { LOOP_SCENES } from "./loop-scenes";

const FRAME_CLASS =
  "flex h-[min(26rem,46svh)] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_2px_8px_-2px_rgba(20,18,11,0.06),0_40px_80px_-24px_rgba(20,18,11,0.18)] lg:h-[min(38rem,68svh)] dark:border-olive-800/70 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_40px_100px_-30px_rgba(0,0,0,0.8)]";

const DOTS = ["close", "minimise", "zoom"] as const;

export default function LoopStage({ step }: { step: number }) {
  const { Scene, chrome, id } = LOOP_SCENES[step];
  const reduceMotion = useReducedMotion();
  const arrive = {
    delay: reduceMotion ? 0 : 0.18,
    duration: reduceMotion ? 0 : 0.32,
    ease: EASE_OUT_EXPO,
  };
  const leave = { duration: reduceMotion ? 0 : 0.22, ease: EASE_OUT_EXPO };

  return (
    <div aria-hidden="true" className={FRAME_CLASS}>
      <div className="flex shrink-0 items-center gap-3 border-border/70 border-b bg-muted/60 px-4 py-2.5 dark:bg-sidebar/60">
        <span className="flex gap-1.5">
          {DOTS.map((dot) => (
            <span className="size-2 rounded-full bg-border" key={dot} />
          ))}
        </span>
        <span className="relative h-4 min-w-0 flex-1">
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-0 truncate font-mono text-[11px] text-muted-foreground leading-4"
              exit={{ opacity: 0, y: -4 }}
              initial={{ opacity: 0, y: 4 }}
              key={chrome}
              transition={{ duration: reduceMotion ? 0 : 0.25 }}
            >
              {chrome}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>

      <div className="relative min-h-0 flex-1">
        <AnimatePresence initial={false}>
          <motion.div
            animate={{ opacity: 1 }}
            className="absolute inset-0"
            exit={{ opacity: 0, transition: leave }}
            initial={{ opacity: 0 }}
            key={id}
            transition={arrive}
          >
            <LoopSpacerLayer>
              <Scene />
            </LoopSpacerLayer>
          </motion.div>
        </AnimatePresence>

        <div className="invisible absolute inset-0">
          <Scene />
        </div>
      </div>
    </div>
  );
}
