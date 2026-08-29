import type { Metadata } from "next";

import { H1, H2, Lead } from "@/components/ui/typography";
import Footer from "@/features/homepage/components/footer";
import MarketingCta, {
  CTA_PRIMARY_CLASS,
} from "@/features/homepage/components/marketing/marketing-cta";
import type { RuledEntry } from "@/features/homepage/components/marketing/ruled-list";
import RuledList from "@/features/homepage/components/marketing/ruled-list";
import Navbar from "@/features/homepage/components/navbar";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Discover how Reflet protects your data with enterprise-grade security, TLS encryption, role-based access controls, GDPR compliance, and regular security audits.",
  keywords: [
    "security",
    "data protection",
    "GDPR",
    "encryption",
    "SOC 2",
    "open source security",
  ],
  path: "/security",
  title: "Security",
});

const GROUPS: { entries: RuledEntry[]; id: string; title: string }[] = [
  {
    entries: [
      {
        description:
          "Your data is hosted on Convex's SOC 2 Type II compliant infrastructure. Automatic backups, zero-downtime deployments, and global edge distribution.",
        id: "convex-cloud",
        title: "Convex Cloud",
      },
      {
        description:
          "The web application runs on Vercel's edge network with automatic TLS encryption, DDoS protection, and 99.99% uptime SLA.",
        id: "vercel-edge",
        title: "Vercel Edge Network",
      },
      {
        description:
          "All data is encrypted in transit (TLS 1.3) and at rest. API keys are hashed before storage. Session tokens use HTTP-only secure cookies.",
        id: "encryption",
        title: "Encryption",
      },
    ],
    id: "infrastructure",
    title: "Infrastructure",
  },
  {
    entries: [
      {
        description:
          "Three permission levels: Owner, Admin, and Member. Control who can manage settings, moderate feedback, and invite team members.",
        id: "rbac",
        title: "Role-Based Access Control",
      },
      {
        description:
          "Powered by Better-Auth with bcrypt password hashing, CSRF protection, and session management with automatic rotation.",
        id: "secure-auth",
        title: "Secure Authentication",
      },
      {
        description:
          "Sign in with GitHub or Google. No passwords stored when using social login.",
        id: "oauth",
        title: "OAuth Providers",
      },
    ],
    id: "authentication",
    title: "Authentication & access",
  },
  {
    entries: [
      {
        description:
          "We process data in accordance with GDPR. Users can request data export or deletion at any time.",
        href: "/privacy",
        id: "gdpr",
        title: "GDPR Compliant",
      },
      {
        description:
          "Our entire codebase is open source. Audit the code yourself, run your own security analysis, or self-host for full control.",
        external: true,
        href: "https://github.com/damien-schneider/reflet",
        id: "open-source",
        title: "Open Source",
      },
      {
        description:
          "Export all your feedback, votes, and changelog entries as CSV or JSON. Your data is yours, always.",
        id: "data-portability",
        title: "Data Portability",
      },
    ],
    id: "data-privacy",
    title: "Data & privacy",
  },
  {
    entries: [
      {
        description:
          "Public keys for read operations, secret keys for write operations. Keys are scoped per organization.",
        id: "api-key-auth",
        title: "API Key Authentication",
      },
      {
        description:
          "Built-in rate limiting on all API endpoints protects against abuse and ensures fair usage.",
        id: "rate-limiting",
        title: "Rate Limiting",
      },
      {
        description:
          "All inputs validated with Zod schemas. XSS protection, SQL injection prevention (Convex's document model), and Content Security Policy headers.",
        id: "input-validation",
        title: "Input Validation",
      },
    ],
    id: "api-security",
    title: "API security",
  },
];

export default function SecurityPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="mx-auto max-w-220 px-5 pt-28 pb-24 sm:px-8 sm:pt-36">
          <H1 className="max-w-180" variant="landing">
            Built on trust, secured by design
          </H1>
          <Lead className="mt-8 max-w-140">
            Your feedback data is sensitive. Here&apos;s how we protect it.
          </Lead>
        </section>

        {GROUPS.map((group) => (
          <section
            className="mx-auto max-w-220 px-5 pb-28 sm:px-8 sm:pb-36"
            key={group.id}
          >
            <H2 className="mb-14 sm:mb-16" variant="landing">
              {group.title}
            </H2>
            <RuledList entries={group.entries} />
          </section>
        ))}

        <MarketingCta
          actions={
            <a className={CTA_PRIMARY_CLASS} href="mailto:security@reflet.app">
              Contact our team
            </a>
          }
          title="Have security questions?"
        />
      </main>
      <Footer />
    </div>
  );
}
