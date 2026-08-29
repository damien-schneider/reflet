"use client";

import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { EASE_OUT_EXPO } from "@/features/homepage/lib/motion";

import { LOOP_SCENES } from "./loop-scenes";

const ACTIVE_HEIGHT = 46;
const ROW_GAP = 28;
const FADE_PER_ROW = 0.07;
const LAST = LOOP_SCENES.length - 1;

function rowState(offset: number) {
  if (offset < 0) {
    return { fontSize: 15, opacity: 0, y: -38 };
  }
  if (offset === 0) {
    return { fontSize: 26, opacity: 1, y: 0 };
  }
  return {
    fontSize: 15,
    opacity: Math.max(0.1, 0.38 - (offset - 1) * FADE_PER_ROW),
    y: ACTIVE_HEIGHT + (offset - 1) * ROW_GAP,
  };
}

export default function LoopTimeline({ step }: { step: number }) {
  const reduceMotion = useReducedMotion();
  const { caption, step: label } = LOOP_SCENES[step];
  const slide = reduceMotion
    ? { duration: 0 }
    : { damping: 30, mass: 0.9, stiffness: 220, type: "spring" as const };
  const swap = { duration: reduceMotion ? 0 : 0.3, ease: EASE_OUT_EXPO };

  return (
    <div className="flex flex-col gap-5 lg:gap-7">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[12px] text-olive-700 tabular-nums dark:text-olive-300">
          <NumberFlow format={{ minimumIntegerDigits: 2 }} value={step + 1} />
          <span className="text-muted-foreground/60">
            /{String(LOOP_SCENES.length).padStart(2, "0")}
          </span>
        </span>
      </div>

      <div className="relative h-8 lg:hidden">
        <AnimatePresence initial={false} mode="wait">
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-x-0 top-0 font-medium text-[22px] text-foreground leading-tight"
            exit={{ opacity: 0, y: -10 }}
            initial={{ opacity: 0, y: 10 }}
            key={label}
            transition={swap}
          >
            {label}
          </motion.p>
        </AnimatePresence>
      </div>

      <motion.ol
        animate={{ height: ACTIVE_HEIGHT + (LAST - step) * ROW_GAP }}
        className="relative hidden overflow-hidden lg:block"
        initial={false}
        transition={slide}
      >
        {LOOP_SCENES.map((scene, index) => (
          <motion.li
            animate={rowState(index - step)}
            className="absolute inset-x-0 top-0 origin-left text-balance font-medium text-foreground leading-tight"
            initial={false}
            key={scene.id}
            transition={slide}
          >
            {scene.step}
          </motion.li>
        ))}
      </motion.ol>

      <div className="relative min-h-11">
        <AnimatePresence initial={false} mode="wait">
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xs text-[13px] text-muted-foreground leading-relaxed"
            exit={{ opacity: 0, y: -8 }}
            initial={{ opacity: 0, y: 8 }}
            key={caption}
            transition={swap}
          >
            {caption}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
