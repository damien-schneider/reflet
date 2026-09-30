import type { Metadata } from "next";

import {
  MarketingPageIntro,
  MarketingSubpage,
  type MarketingTopic,
  MarketingTopicGroup,
} from "@/features/homepage/components/marketing-subpage";
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

const INFRASTRUCTURE: MarketingTopic[] = [
  {
    description:
      "Your data lives on Convex’s SOC 2 Type II compliant infrastructure, with automatic backups and zero-downtime deployments.",
    id: "convex-cloud",
    title: "Convex Cloud",
  },
  {
    description:
      "The web app runs on Vercel’s edge network with automatic TLS and DDoS protection.",
    id: "vercel-edge",
    title: "Vercel Edge Network",
  },
  {
    description:
      "Data is encrypted in transit (TLS 1.3) and at rest. API keys are hashed before storage. Session tokens live in HTTP-only secure cookies.",
    id: "encryption",
    title: "Encryption",
  },
];

const AUTHENTICATION: MarketingTopic[] = [
  {
    description:
      "Three roles: Owner, Admin, and Member. Decide who can change settings, moderate feedback, and invite teammates.",
    id: "rbac",
    title: "Role-based access control",
  },
  {
    description:
      "Built on Better-Auth, with bcrypt password hashing, CSRF protection, and automatic session rotation.",
    id: "secure-auth",
    title: "Secure authentication",
  },
  {
    description:
      "Sign in with GitHub or Google. No password is stored when you use social login.",
    id: "oauth",
    title: "OAuth providers",
  },
];

const DATA_PRIVACY: MarketingTopic[] = [
  {
    description:
      "We process data in line with GDPR. Anyone can request an export or deletion of their data at any time.",
    id: "gdpr",
    link: { href: "/privacy", label: "Read the privacy policy" },
    title: "GDPR",
  },
  {
    description:
      "The whole codebase is public. Audit it, run your own security analysis, or self-host for full control.",
    id: "open-source",
    link: {
      external: true,
      href: "https://github.com/damien-schneider/reflet",
      label: "View the code on GitHub",
    },
    title: "Open source",
  },
  {
    description:
      "Export your feedback, votes, and changelog entries as CSV or JSON. Your data stays yours.",
    id: "data-portability",
    title: "Data portability",
  },
];

const API_SECURITY: MarketingTopic[] = [
  {
    description:
      "Public keys for reads, secret keys for writes. Every key is scoped to one organization.",
    id: "api-key-auth",
    title: "API key authentication",
  },
  {
    description:
      "Every API endpoint is rate limited to protect against abuse and keep usage fair.",
    id: "rate-limiting",
    title: "Rate limiting",
  },
  {
    description:
      "Inputs are validated with Zod schemas. XSS protection, no SQL injection surface (Convex uses a document model), and Content Security Policy headers.",
    id: "input-validation",
    title: "Input validation",
  },
];

export default function SecurityPage() {
  return (
    <MarketingSubpage>
      <div className="marketing-section pt-16 md:pt-24">
        <MarketingPageIntro
          align="start"
          kicker="Security"
          title="How we protect your feedback data"
        >
          Feedback often holds what your customers would only tell you. Here is
          how Reflet keeps it safe.
        </MarketingPageIntro>
        <MarketingTopicGroup title="Infrastructure" topics={INFRASTRUCTURE} />
        <MarketingTopicGroup
          title="Authentication and access"
          topics={AUTHENTICATION}
        />
        <MarketingTopicGroup title="Data and privacy" topics={DATA_PRIVACY} />
        <MarketingTopicGroup title="API security" topics={API_SECURITY} />
        <MarketingTopicGroup
          title="Questions?"
          topics={[
            {
              description:
                "Found a vulnerability or need details for a security review? Write to us and a person will answer.",
              id: "contact",
              link: {
                href: "mailto:security@reflet.app",
                label: "security@reflet.app",
              },
              title: "Talk to the team",
            },
          ]}
        />
      </div>
    </MarketingSubpage>
  );
}
