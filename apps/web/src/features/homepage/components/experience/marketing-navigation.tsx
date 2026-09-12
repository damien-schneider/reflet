import { ButtonLink } from "@ctrl-ui/react/ui/button";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { RefletMark } from "@/features/homepage/components/experience/branding/reflet-mark";

export function MarketingNavigation() {
  return (
    <header className="marketing-navigation">
      <Link aria-label="Reflet home" className="marketing-wordmark" href="/">
        <RefletMark />
        reflet
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/#story">The story</Link>
        <Link href="/pricing">Pricing</Link>
        <Link className="marketing-docs-link" href="/docs">
          Docs
        </Link>
      </nav>
      <div className="marketing-navigation-actions">
        <ThemeToggle />
        <Link className="marketing-login" href="/dashboard">
          Log in
        </Link>
        <ButtonLink
          render={<Link href="/dashboard" />}
          size="sm"
          tone="primary"
          variant="solid"
        >
          Start free <ArrowUpRight aria-hidden="true" size={13} />
        </ButtonLink>
      </div>
    </header>
  );
}
