import type { Transition } from "motion/react";

export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export const RISE: Transition = {
  duration: 0.7,
  ease: EASE_OUT_EXPO,
};

export const SNAP: Transition = {
  damping: 32,
  mass: 0.6,
  stiffness: 380,
  type: "spring",
};
