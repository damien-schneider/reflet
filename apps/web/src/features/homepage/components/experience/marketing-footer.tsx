import { ButtonLink } from "@ctrl-ui/react/ui/button";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ClosingReflection } from "@/features/homepage/components/experience/branding/closing-reflection";

const CLOSING_TITLE_ID = "marketing-closing-title";

const FOOTER_GROUPS = [
  {
    label: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/integrations", label: "Integrations" },
      { href: "/pricing", label: "Pricing" },
      { href: "/docs", label: "Documentation" },
      { href: "/blog", label: "Blog" },
    ],
  },
  {
    label: "Company",
    links: [
      { href: "/security", label: "Security" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/cookies", label: "Cookies" },
      { href: "https://github.com/damien-schneider/reflet", label: "GitHub" },
    ],
  },
] as const;

export function MarketingFooter() {
  return (
    <>
      <ClosingReflection titleId={CLOSING_TITLE_ID}>
        <h2 id={CLOSING_TITLE_ID}>
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
      </ClosingReflection>
      <footer className="marketing-footer">
        <div className="marketing-footer-brand">
          <Link className="marketing-wordmark" href="/">
            reflet
          </Link>
          <p>Good feedback comes full circle.</p>
          <span className="marketing-caption">
            © {new Date().getFullYear()} Reflet
          </span>
        </div>
        <nav aria-label="Footer" className="marketing-footer-links">
          {FOOTER_GROUPS.map((group) => (
            <div key={group.label}>
              <h2 className="marketing-footer-heading">{group.label}</h2>
              <ul>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>
                      {link.label}
                      {link.href.startsWith("https://") && (
                        <ArrowUpRight aria-hidden="true" size={12} />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </footer>
    </>
  );
}
