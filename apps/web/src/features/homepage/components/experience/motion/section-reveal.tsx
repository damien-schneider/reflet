"use client";

import { domAnimation, LazyMotion, m } from "motion/react";
import { type ReactNode, useState } from "react";

export function SectionReveal({
  children,
  className,
  sequence = false,
}: {
  children: ReactNode;
  className?: string;
  sequence?: boolean;
}) {
  const [visibility, setVisibility] = useState("pending");

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        className={className}
        data-reveal={visibility}
        data-reveal-sequence={sequence}
        onViewportEnter={() => setVisibility("visible")}
        onViewportLeave={() => setVisibility("outside")}
        viewport={{ amount: "some", once: false }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
