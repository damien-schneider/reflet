import { ButtonLink } from "@ctrl-ui/react/ui/button";
import { ArrowDown, ArrowUpRight, GitBranch } from "lucide-react";
import Link from "next/link";
import { HeroIntro } from "@/features/homepage/components/experience/hero/hero-intro";
import { HeroReflection } from "@/features/homepage/components/experience/hero/reflection/hero-reflection";
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
        <div className="hero-main">
          <div className="marketing-hero-copy">
            <h1 id="marketing-hero-title">
              <span>Listen closely.</span>
              <br />
              <span>Build what matters.</span>
            </h1>
            <p>
              Collect feedback inside your app, plan it in the open, and tell
              people when it ships.
            </p>
            <HeroActions />
          </div>
          <HeroReflection />
        </div>
      </HeroIntro>
      <HeroStoryLinks />
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

const STORY_LINKS = [
  {
    feature: "collect",
    label: "Collect ideas where they happen",
    step: "capture",
  },
  { feature: "plan", label: "Plan in the open", step: "planned" },
  { feature: "release", label: "Tell people it shipped", step: "notify" },
] as const;

function HeroStoryLinks() {
  return (
    <nav aria-label="Your feedback loop" className="hero-story-links">
      {STORY_LINKS.map((link, index) => (
        <a
          data-feature={link.feature}
          href={`#${journeyAnchorId(link.step)}`}
          key={link.step}
        >
          <span className="hero-story-number">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span>{link.label}</span>
          <ArrowDown aria-hidden="true" size={15} />
        </a>
      ))}
    </nav>
  );
}
