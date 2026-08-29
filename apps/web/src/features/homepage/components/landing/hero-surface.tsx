"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useRef } from "react";

import { cn } from "@/lib/utils";

import FeedbackBoard from "./mockups/feedback-board";

const BOARD_CLASS =
  "overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_2px_8px_-2px_rgba(20,18,11,0.06),0_40px_80px_-24px_rgba(20,18,11,0.18)] dark:border-olive-800/70 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_40px_100px_-30px_rgba(0,0,0,0.8)]";

/* box-reflect: WebKit/Blink only, Firefox gets no reflection */
const REFLECTION_CLASS =
  "[-webkit-box-reflect:below_2px_linear-gradient(transparent_76%,rgba(255,255,255,0.22))]";

export default function HeroSurface() {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    offset: ["start 65%", "end start"],
    target: ref,
  });
  const parallaxY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, reduceMotion ? 0 : -32]
  );

  return (
    <div className="relative [perspective:2000px]" ref={ref}>
      <motion.div className="relative" style={{ y: parallaxY }}>
        <div
          className={cn(
            BOARD_CLASS,
            REFLECTION_CLASS,
            "hero-animate hero-rise origin-top [transform-style:preserve-3d]"
          )}
        >
          <FeedbackBoard />
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px translate-y-px bg-[linear-gradient(to_right,transparent,color-mix(in_oklch,var(--color-olive-950)_35%,transparent)_22%,color-mix(in_oklch,var(--color-olive-950)_35%,transparent)_78%,transparent)] dark:bg-[linear-gradient(to_right,transparent,color-mix(in_oklch,var(--color-olive-200)_55%,transparent)_22%,color-mix(in_oklch,var(--color-olive-200)_55%,transparent)_78%,transparent)]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-full h-32 backdrop-blur-[2px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
        />
      </motion.div>
    </div>
  );
}
