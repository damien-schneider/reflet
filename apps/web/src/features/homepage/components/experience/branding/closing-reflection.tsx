"use client";

import { domAnimation, LazyMotion, m, useSpring } from "motion/react";
import type { ReactNode } from "react";
import { RefletMark } from "@/features/homepage/components/experience/branding/reflet-mark";
import { useMotionPreference } from "@/features/homepage/components/experience/motion/use-motion-preference";
import "@/features/homepage/components/experience/branding/closing-reflection.css";

export function ClosingReflection({ children }: { children: ReactNode }) {
  const reducedMotion = useMotionPreference();
  const pointerX = useSpring(0, { damping: 24, stiffness: 130 });
  const pointerY = useSpring(0, { damping: 24, stiffness: 130 });
  return (
    <LazyMotion features={domAnimation} strict>
      <m.section
        className="marketing-closing"
        onPointerLeave={() => {
          pointerX.set(0);
          pointerY.set(0);
        }}
        onPointerMove={(event) => {
          if (reducedMotion || event.pointerType !== "mouse") {
            return;
          }
          const bounds = event.currentTarget.getBoundingClientRect();
          pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
          pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
        }}
        style={{ "--reflection-x": pointerX, "--reflection-y": pointerY }}
      >
        <div aria-hidden="true" className="closing-reflection">
          <div className="closing-reflection-source">
            <RefletMark />
          </div>
          <div className="closing-reflection-water">
            <RefletMark />
          </div>
          <span className="closing-reflection-ripple" />
          <span className="closing-reflection-ripple" />
        </div>
        {children}
      </m.section>
    </LazyMotion>
  );
}
