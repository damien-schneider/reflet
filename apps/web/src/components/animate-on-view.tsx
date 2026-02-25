"use client";

/**
 * Thin client wrapper for scroll-triggered animations.
 * Keeps content server-rendered while adding motion on scroll.
 */
import { motion, useInView } from "motion/react";
import { useRef } from "react";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export function AnimateOnView({
  children,
  className,
  delay = 0,
  duration = 0.7,
  amount = 0.3,
  y = 24,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  amount?: number;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount });

  return (
    <motion.div
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      className={className}
      initial={{ opacity: 0, y }}
      ref={ref}
      transition={{ delay, duration, ease: EASE_OUT_EXPO }}
    >
      {children}
    </motion.div>
  );
}
