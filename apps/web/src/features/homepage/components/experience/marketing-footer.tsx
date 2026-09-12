import { ButtonLink } from "@ctrl-ui/react/ui/button";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ClosingReflection } from "@/features/homepage/components/experience/branding/closing-reflection";
import { SectionReveal } from "@/features/homepage/components/experience/motion/section-reveal";

export function MarketingFooter() {
  return (
    <>
      <ClosingReflection>
        <SectionReveal sequence>
          <h2>
            Something good
            <br />
            starts with listening.
          </h2>
          <ButtonLink
            render={<Link href="/dashboard" />}
            size="lg"
            tone="primary"
            variant="solid"
          >
            Start collecting feedback{" "}
            <ArrowUpRight aria-hidden="true" size={15} />
          </ButtonLink>
          <span className="marketing-caption">
            Free to start. No credit card.
          </span>
        </SectionReveal>
      </ClosingReflection>
      <footer className="marketing-footer">
        <div>
          <Link className="marketing-wordmark" href="/">
            reflet
          </Link>
          <p>Good feedback comes full circle.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/docs">Documentation</Link>
          <a href="https://github.com/damien-schneider/reflet">GitHub ↗</a>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
        <span className="marketing-caption">
          © {new Date().getFullYear()} Reflet
        </span>
      </footer>
    </>
  );
}
