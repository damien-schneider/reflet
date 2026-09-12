import { ButtonLink } from "@ctrl-ui/react/ui/button";
import { ArrowDown, ArrowUpRight, GitBranch } from "lucide-react";
import Link from "next/link";
import { HeroReflection } from "@/features/homepage/components/experience/hero/reflection/hero-reflection";
import { journeyAnchorId } from "@/features/homepage/components/experience/journey/journey-data";
import { SectionReveal } from "@/features/homepage/components/experience/motion/section-reveal";
import "@/features/homepage/components/experience/hero/hero.css";

export function MarketingHero() {
  return (
    <section className="marketing-hero">
      <SectionReveal className="hero-canvas">
        <div className="hero-editorial-line">
          <span>A little feedback. A lasting impression.</span>
          <a
            className="hero-open-source"
            href="https://github.com/damien-schneider/reflet"
          >
            <GitBranch aria-hidden="true" size={13} /> Open source
            <ArrowUpRight aria-hidden="true" size={13} />
          </a>
        </div>
        <div className="hero-main">
          <div className="marketing-hero-copy">
            <h1>
              <span>Listen closely.</span>
              <br />
              <span>Build what matters.</span>
            </h1>
            <p>Turn feedback into your next great release.</p>
            <HeroActions />
          </div>
          <HeroReflection />
        </div>
      </SectionReveal>
      <SectionReveal>
        <HeroStoryLinks />
      </SectionReveal>
    </section>
  );
}

function HeroActions() {
  return (
    <div className="hero-actions">
      <ButtonLink
        render={<Link href="/dashboard" />}
        size="lg"
        tone="primary"
        variant="solid"
      >
        Start your feedback loop <ArrowUpRight aria-hidden="true" size={16} />
      </ButtonLink>
      <a
        className="marketing-text-link"
        href={`#${journeyAnchorId("capture")}`}
      >
        Explore the feedback loop <ArrowDown aria-hidden="true" size={14} />
      </a>
    </div>
  );
}

function HeroStoryLinks() {
  return (
    <nav aria-label="Your feedback loop" className="hero-story-links">
      <a data-feature="collect" href={`#${journeyAnchorId("capture")}`}>
        <span className="hero-story-number">01</span>
        <span>Every idea starts somewhere.</span>
        <ArrowUpRight aria-hidden="true" size={15} />
      </a>
      <a data-feature="plan" href={`#${journeyAnchorId("planned")}`}>
        <span className="hero-story-number">02</span>
        <span>Give it a little direction.</span>
        <ArrowUpRight aria-hidden="true" size={15} />
      </a>
      <a data-feature="release" href={`#${journeyAnchorId("notify")}`}>
        <span className="hero-story-number">03</span>
        <span>Bring the good news back.</span>
        <ArrowUpRight aria-hidden="true" size={15} />
      </a>
    </nav>
  );
}
