import {
  BookOpen,
  CheckCircle,
  Cloud,
  DownloadSimple,
  Fingerprint,
  Globe,
  IdentificationCard,
  Key,
  LockKey,
  ShieldCheck,
  Timer,
  Users,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { H1, H2, H3, Lead, Text } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  title: "Security",
  description:
    "Learn how Reflet protects your feedback data with enterprise-grade security, encryption, and compliance.",
  path: "/security",
  keywords: [
    "security",
    "data protection",
    "GDPR",
    "encryption",
    "SOC 2",
    "open source security",
  ],
});

const INFRASTRUCTURE = [
  {
    id: "convex-cloud",
    icon: Cloud,
    title: "Convex Cloud",
    description:
      "Your data is hosted on Convex's SOC 2 Type II compliant infrastructure. Automatic backups, zero-downtime deployments, and global edge distribution.",
  },
  {
    id: "vercel-edge",
    icon: Globe,
    title: "Vercel Edge Network",
    description:
      "The web application runs on Vercel's edge network with automatic TLS encryption, DDoS protection, and 99.99% uptime SLA.",
  },
  {
    id: "encryption",
    icon: LockKey,
    title: "Encryption",
    description:
      "All data is encrypted in transit (TLS 1.3) and at rest. API keys are hashed before storage. Session tokens use HTTP-only secure cookies.",
  },
] as const;

const AUTHENTICATION = [
  {
    id: "rbac",
    icon: Users,
    title: "Role-Based Access Control",
    description:
      "Three permission levels: Owner, Admin, and Member. Control who can manage settings, moderate feedback, and invite team members.",
  },
  {
    id: "secure-auth",
    icon: ShieldCheck,
    title: "Secure Authentication",
    description:
      "Powered by Better-Auth with bcrypt password hashing, CSRF protection, and session management with automatic rotation.",
  },
  {
    id: "oauth",
    icon: Key,
    title: "OAuth Providers",
    description:
      "Sign in with GitHub or Google. No passwords stored when using social login.",
  },
] as const;

const DATA_PRIVACY = [
  {
    id: "gdpr",
    icon: Fingerprint,
    title: "GDPR Compliant",
    description:
      "We process data in accordance with GDPR. Users can request data export or deletion at any time.",
    link: { href: "/privacy", label: "Read our Privacy Policy" },
  },
  {
    id: "open-source",
    icon: BookOpen,
    title: "Open Source",
    description:
      "Our entire codebase is open source. Audit the code yourself, run your own security analysis, or self-host for full control.",
    link: {
      href: "https://github.com/damien-schneider/reflet",
      label: "View on GitHub",
      external: true,
    },
  },
  {
    id: "data-portability",
    icon: DownloadSimple,
    title: "Data Portability",
    description:
      "Export all your feedback, votes, and changelog entries as CSV or JSON. Your data is yours, always.",
  },
] as const;

const API_SECURITY = [
  {
    id: "api-key-auth",
    icon: IdentificationCard,
    title: "API Key Authentication",
    description:
      "Public keys for read operations, secret keys for write operations. Keys are scoped per organization.",
  },
  {
    id: "rate-limiting",
    icon: Timer,
    title: "Rate Limiting",
    description:
      "Built-in rate limiting on all API endpoints protects against abuse and ensures fair usage.",
  },
  {
    id: "input-validation",
    icon: CheckCircle,
    title: "Input Validation",
    description:
      "All inputs validated with Zod schemas. XSS protection, SQL injection prevention (Convex's document model), and Content Security Policy headers.",
  },
] as const;

interface SecurityCard {
  id: string;
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  description: string;
  link?: { href: string; label: string; external?: boolean };
}

const linkClassName =
  "mt-4 inline-block font-medium text-olive-600 text-sm underline underline-offset-4 transition-colors hover:text-olive-700 dark:text-olive-400 dark:hover:text-olive-300";

function CardLink({
  link,
}: {
  link: { href: string; label: string; external?: boolean };
}) {
  if (link.external) {
    return (
      <a
        className={linkClassName}
        href={link.href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {link.label}
      </a>
    );
  }

  return (
    <Link className={linkClassName} href={link.href}>
      {link.label}
    </Link>
  );
}

function SecurityCardItem({ card }: { card: SecurityCard }) {
  const Icon = card.icon;

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-foreground">
        <Icon size={24} />
      </div>
      <H3 className="mb-3" variant="card">
        {card.title}
      </H3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {card.description}
      </p>
      {card.link ? <CardLink link={card.link} /> : null}
    </div>
  );
}

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          className="text-muted-foreground text-sm hover:text-foreground"
          href="/"
        >
          &larr; Back to Reflet
        </Link>

        {/* Header */}
        <header className="mt-12 mb-20">
          <span className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">
            Security
          </span>
          <H1 className="mt-4" variant="page">
            Built on trust, secured by design
          </H1>
          <Lead className="mt-4 max-w-2xl">
            Your feedback data is sensitive. Here&apos;s how we protect it.
          </Lead>
        </header>

        {/* Infrastructure */}
        <section className="mb-20">
          <H2 className="mb-10" variant="section">
            Infrastructure
          </H2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {INFRASTRUCTURE.map((card) => (
              <SecurityCardItem card={card} key={card.id} />
            ))}
          </div>
        </section>

        {/* Authentication & Access */}
        <section className="mb-20">
          <H2 className="mb-10" variant="section">
            Authentication & Access
          </H2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {AUTHENTICATION.map((card) => (
              <SecurityCardItem card={card} key={card.id} />
            ))}
          </div>
        </section>

        {/* Data & Privacy */}
        <section className="mb-20">
          <H2 className="mb-10" variant="section">
            Data & Privacy
          </H2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {DATA_PRIVACY.map((card) => (
              <SecurityCardItem card={card} key={card.id} />
            ))}
          </div>
        </section>

        {/* API Security */}
        <section className="mb-20">
          <H2 className="mb-10" variant="section">
            API Security
          </H2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {API_SECURITY.map((card) => (
              <SecurityCardItem card={card} key={card.id} />
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="rounded-2xl border border-border bg-card p-12 text-center">
          <H2 className="mb-4">Have security questions?</H2>
          <Text className="mx-auto mb-8 max-w-lg text-muted-foreground">
            We&apos;re happy to discuss our security practices in detail.
          </Text>
          <a
            className="inline-block font-medium text-olive-600 text-sm underline underline-offset-4 transition-colors hover:text-olive-700 dark:text-olive-400 dark:hover:text-olive-300"
            href="mailto:security@reflet.app"
          >
            Contact our team
          </a>
        </section>

        {/* Footer links */}
        <footer className="mt-16 border-border border-t pt-8">
          <div className="flex flex-wrap gap-4 text-muted-foreground text-sm">
            <Link className="hover:text-foreground" href="/privacy">
              Privacy Policy
            </Link>
            <Link className="hover:text-foreground" href="/terms">
              Terms of Service
            </Link>
            <Link className="hover:text-foreground" href="/">
              Back to Reflet
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
