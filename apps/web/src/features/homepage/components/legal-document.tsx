import Link from "next/link";
import type { ReactNode } from "react";
import { MarketingSubpage } from "@/features/homepage/components/marketing-subpage";

const LEGAL_DOCUMENTS = [
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of service" },
  { href: "/cookies", label: "Cookie policy" },
] as const;

type LegalPath = (typeof LEGAL_DOCUMENTS)[number]["href"];

const LEGAL_PROSE = [
  "text-body-lg text-muted-foreground leading-relaxed",
  "[&_section]:mt-12 [&_section:first-child]:mt-0",
  "[&_section>*+*]:mt-4",
  "[&_h2]:scroll-mt-24 [&_h2]:text-balance [&_h2]:text-heading-2 [&_h2]:text-foreground [&_h2]:tracking-[-0.02em]",
  "[&_h3]:pt-2 [&_h3]:text-balance [&_h3]:text-heading-3 [&_h3]:text-foreground",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
  "[&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:ps-6 [&_ul]:marker:text-muted-foreground",
  "[&_a]:text-foreground [&_a]:underline [&_a]:decoration-from-font [&_a]:underline-offset-4",
  "[&_code]:font-mono [&_code]:text-body [&_code]:text-foreground",
].join(" ");

interface LegalDocumentProps {
  children: ReactNode;
  effectiveDate: string;
  path: LegalPath;
  title: string;
}

export function LegalDocument({
  children,
  effectiveDate,
  path,
  title,
}: LegalDocumentProps) {
  return (
    <MarketingSubpage>
      <div className="marketing-section pt-16 md:pt-24">
        <article className="mx-auto max-w-prose">
          <header className="mb-14 border-(--marketing-hairline) border-b pb-10">
            <span className="marketing-kicker">Legal</span>
            <h1 className="text-balance text-display md:text-[2.75rem]">
              {title}
            </h1>
            <p className="mt-5 text-body text-muted-foreground">
              Effective <time>{effectiveDate}</time> · Damien Schneider EI,
              France
            </p>
          </header>
          <div className={LEGAL_PROSE}>{children}</div>
          <nav
            aria-label="Legal documents"
            className="mt-16 flex flex-wrap gap-x-6 gap-y-2 border-(--marketing-hairline) border-t pt-8 text-body"
          >
            {LEGAL_DOCUMENTS.map((document) =>
              document.href === path ? (
                <span
                  aria-current="page"
                  className="text-foreground"
                  key={document.href}
                >
                  {document.label}
                </span>
              ) : (
                <Link
                  className="marketing-text-link text-muted-foreground hover:text-foreground"
                  href={document.href}
                  key={document.href}
                >
                  {document.label}
                </Link>
              )
            )}
          </nav>
        </article>
      </div>
    </MarketingSubpage>
  );
}
