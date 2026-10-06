import { ButtonLink } from "@ctrl-ui/react/ui/button";
import { ArrowDown, ArrowUpRight, GitBranch } from "lucide-react";
import Link from "next/link";
import { HeroIntro } from "@/features/homepage/components/experience/hero/hero-intro";
import { HeroStage } from "@/features/homepage/components/experience/hero/hero-stage";
import { journeyAnchorId } from "@/features/homepage/components/experience/journey/journey-data";
import "@/features/homepage/components/experience/hero/hero.css";

export function MarketingHero() {
  return (
    <section aria-labelledby="marketing-hero-title" className="marketing-hero">
      <HeroIntro>
        <div className="hero-editorial-line">
          <span>Feedback, roadmap and changelog in one place.</span>
          <a
            className="hero-open-source"
            href="https://github.com/damien-schneider/reflet"
          >
            <GitBranch aria-hidden="true" size={13} /> Open source
            <ArrowUpRight aria-hidden="true" size={13} />
          </a>
        </div>
        <HeroStage>
          <div className="marketing-hero-copy">
            <h1 id="marketing-hero-title">
              <span>They ask.</span>
              <br />
              <span>You ship.</span>
            </h1>
            <p>
              Reflet collects feedback inside your app, plans it in the open,
              and tells people when it ships.
            </p>
            <HeroActions />
          </div>
        </HeroStage>
      </HeroIntro>
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
        Start for free <ArrowUpRight aria-hidden="true" size={16} />
      </ButtonLink>
      <a
        className="marketing-text-link"
        href={`#${journeyAnchorId("capture")}`}
      >
        See how it works <ArrowDown aria-hidden="true" size={14} />
      </a>
    </div>
  );
}
