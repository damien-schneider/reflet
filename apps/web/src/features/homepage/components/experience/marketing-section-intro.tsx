import type { ReactNode } from "react";
import { SectionReveal } from "@/features/homepage/components/experience/motion/section-reveal";

export function MarketingSectionIntro({
  children,
  kicker,
  title,
}: {
  children: ReactNode;
  kicker: string;
  title: ReactNode;
}) {
  return (
    <SectionReveal className="marketing-section-intro" sequence>
      <span className="marketing-kicker">{kicker}</span>
      <h2>{title}</h2>
      <p>{children}</p>
    </SectionReveal>
  );
}
