"use client";

import { ArrowDown } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { ProductMoment } from "@/features/homepage/components/experience/hero/preview/product-preview";
import { HeroReflection } from "@/features/homepage/components/experience/hero/reflection/hero-reflection";
import { journeyAnchorId } from "@/features/homepage/components/experience/journey/journey-data";

const STORY_LINKS = [
  {
    feature: "collect",
    label: "Collect ideas where they happen",
    moment: "idea",
    step: "capture",
  },
  {
    feature: "plan",
    label: "Plan in the open",
    moment: "plan",
    step: "planned",
  },
  {
    feature: "release",
    label: "Tell people it shipped",
    moment: "release",
    step: "notify",
  },
] as const;

export function HeroStage({ children }: { children: ReactNode }) {
  const [moment, setMoment] = useState<ProductMoment>("idea");
  return (
    <>
      <div className="hero-main">
        {children}
        <HeroReflection moment={moment} />
      </div>
      <nav aria-label="Your feedback loop" className="hero-story-links">
        {STORY_LINKS.map((link, index) => (
          <a
            data-active={link.moment === moment}
            data-feature={link.feature}
            href={`#${journeyAnchorId(link.step)}`}
            key={link.step}
            onFocus={() => setMoment(link.moment)}
            onPointerEnter={() => setMoment(link.moment)}
          >
            <span className="hero-story-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{link.label}</span>
            <ArrowDown aria-hidden="true" size={15} />
          </a>
        ))}
      </nav>
    </>
  );
}
