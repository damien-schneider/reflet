"use client";

import {
  type MotionValue,
  motion,
  useReducedMotion,
  useTransform,
} from "motion/react";

import { cn } from "@/lib/utils";

import { LOOP_SCENES } from "./loop-scenes";

const LAST = LOOP_SCENES.length - 1;
const TICK_TOP = 14;
const TICK_SPAN = 72;
const RAIL_MASK =
  "[mask-image:linear-gradient(to_bottom,transparent,black_9%,black_91%,transparent)]";

export default function LoopRail({
  progress,
  step,
}: {
  progress: MotionValue<number>;
  step: number;
}) {
  const reduceMotion = useReducedMotion();
  const fill = useTransform(progress, [0, LAST / LOOP_SCENES.length], [0, 1]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 mx-auto flex w-full max-w-280 px-5 sm:px-8"
    >
      <div className={cn("relative h-full w-4", RAIL_MASK)}>
        <span className="absolute inset-y-0 left-0 w-px bg-border" />
        <motion.span
          className="absolute top-0 left-0 h-full w-px origin-top bg-olive-600 dark:bg-olive-400"
          style={{ scaleY: fill }}
        />

        {LOOP_SCENES.map((scene, index) => (
          <motion.span
            animate={{
              opacity: index <= step ? 1 : 0.45,
              width: index === step ? 15 : 6,
            }}
            className={cn(
              "absolute left-0 h-px",
              index <= step ? "bg-olive-600 dark:bg-olive-400" : "bg-border"
            )}
            initial={false}
            key={scene.id}
            style={{ top: `${TICK_TOP + (index / LAST) * TICK_SPAN}%` }}
            transition={{
              damping: 30,
              mass: 0.8,
              stiffness: 260,
              type: reduceMotion ? false : "spring",
            }}
          />
        ))}
      </div>
    </div>
  );
}
