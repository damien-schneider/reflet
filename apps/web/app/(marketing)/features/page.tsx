import { Button } from "@ctrl-ui/react/ui/button";
import Link from "next/link";
import {
  Brain,
  ChatCircleDots,
  Code,
  GithubLogo,
  Lightning,
} from "@/components/phosphor-icons";
import { FeatureMockup } from "@/features/homepage/components/feature-mockups";
import Footer from "@/features/homepage/components/footer";
import Navbar from "@/features/homepage/components/navbar";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata = generatePageMetadata({
  description:
    "AI-powered triage, embeddable widget, two-way GitHub sync, real-time collaboration, and REST API. Everything developer-led SaaS teams need to close the feedback loop.",
  keywords: [
    "feedback widget",
    "AI triage",
    "GitHub sync",
    "real-time collaboration",
    "REST API",
    "developer feedback tool",
    "SaaS feedback platform",
    "product roadmap features",
  ],
  path: "/features",
  title: "Features | Reflet - Built for Developer-Led SaaS Teams",
});

const FEATURES = [
  {
    accent: "text-chart-4-text",
    accentBg: "bg-chart-4/10",
    description:
      "Auto-tag, score priority, estimate complexity, and detect duplicates — all in milliseconds.",
    details: [
      "Automatic categorization and tagging of incoming feedback",
      "Priority scoring based on user sentiment and request frequency",
      "Complexity estimation to help plan sprints",
      "Duplicate detection with configurable match threshold",
      "Confidence scores so you always stay in control",
    ],
    icon: Brain,
    id: "ai",
    title: "AI-Powered Triage",
  },
  {
    accent: "text-success-text",
    accentBg: "bg-success-subtle",
    description:
      "Drop a script tag into your app. Users submit feedback without leaving your product.",
    details: [
      "One-line script tag installation — no build step needed",
      "Full React SDK with useFeedbackList(), useVote(), and more",
      "Customizable theme to match your brand",
      "Changelog widget to announce releases in-app",
      "TypeScript-first with full type definitions",
    ],
    icon: ChatCircleDots,
    id: "widget",
    title: "Embeddable Widget",
  },
  {
    accent: "text-foreground",
    accentBg: "bg-muted",
    description:
      "Link feedback to issues. When a PR merges, the linked request moves to shipped.",
    details: [
      "Create GitHub issues directly from feedback items",
      "Automatic status sync — merged PRs update feedback status",
      "Link multiple feedback items to a single issue",
      "Auto-generate changelog entries from merged PRs",
      "Works with GitHub Actions and CI/CD pipelines",
    ],
    icon: GithubLogo,
    id: "github",
    title: "Two-Way GitHub Sync",
  },
  {
    accent: "text-warning-text",
    accentBg: "bg-warning-subtle",
    description:
      "Built on Convex — votes, comments, and status changes sync instantly across all devices.",
    details: [
      "Zero-latency updates across all connected clients",
      "Live vote counts and comment threads",
      "Instant status change notifications",
      "Multiplayer editing without conflicts",
      "Optimistic UI for snappy interactions",
    ],
    icon: Lightning,
    id: "realtime",
    title: "Real-Time Everything",
  },
  {
    accent: "text-chart-2-text",
    accentBg: "bg-chart-2/10",
    description:
      "Full CRUD API for programmatic access. Webhooks fire on every status transition.",
    details: [
      "RESTful endpoints for feedback, votes, and comments",
      "Webhook notifications for status changes and new items",
      "API key authentication with granular permissions",
      "Rate limiting with generous free-tier quotas",
      "OpenAPI specification for easy integration",
    ],
    icon: Code,
    id: "api",
    title: "REST API & Webhooks",
  },
] as const;

export default function FeaturesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,var(--brand-subtle),transparent)]" />
          <div className="relative mx-auto max-w-300 px-5 text-center sm:px-8">
            <span className="mb-3 block font-semibold text-brand-text text-caption uppercase tracking-[0.15em]">
              Built for developer-led SaaS teams
            </span>
            <h1 className="mx-auto mb-6 max-w-180 font-display text-[clamp(2rem,5vw,3.5rem)] text-foreground leading-[1.1] tracking-[-0.02em]">
              Everything you need to ship what users actually want.
            </h1>
            <p className="mx-auto mb-10 max-w-140 text-body-lg text-muted-foreground leading-relaxed sm:font-normal sm:text-heading-3">
              From collecting raw feedback to publishing changelogs — Reflet
              handles the full loop with AI triage, real-time sync, and
              developer-friendly tools. Built for teams that ship fast.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button
                  className="h-11 rounded-full px-6 text-body"
                  size="md"
                  tone="primary"
                  variant="solid"
                >
                  Get started free
                </Button>
              </Link>
              <Link
                className="font-medium text-body text-foreground transition-opacity hover:opacity-70"
                href="/docs"
              >
                Read the docs
              </Link>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-300 px-5 sm:px-8">
            <div className="grid gap-12 sm:gap-16">
              {FEATURES.map((feature, idx) => {
                const Icon = feature.icon;
                const isReversed = idx % 2 === 1;
                return (
                  <div
                    className={`grid items-start gap-8 lg:grid-cols-2 lg:gap-16 ${isReversed ? "lg:[&>*:first-child]:order-2" : ""}`}
                    key={feature.id}
                  >
                    {/* Text content */}
                    <div>
                      <div className="mb-4 flex items-center gap-3">
                        <div
                          className={`flex size-10 items-center justify-center rounded-xl ${feature.accentBg} ${feature.accent}`}
                        >
                          <Icon size={20} weight="duotone" />
                        </div>
                        <h2 className="font-display text-[clamp(1.4rem,3vw,2rem)] text-foreground leading-[1.15] tracking-[-0.01em]">
                          {feature.title}
                        </h2>
                      </div>
                      <p className="mb-6 max-w-md text-body text-muted-foreground leading-relaxed sm:text-body-lg">
                        {feature.description}
                      </p>
                      <ul className="space-y-3">
                        {feature.details.map((detail) => (
                          <li
                            className="flex items-start gap-3 text-body text-foreground/80"
                            key={detail}
                          >
                            <span className="mt-2 block size-1.5 shrink-0 rounded-full bg-brand" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Feature mockup */}
                    <div className="flex items-center justify-center">
                      <FeatureMockup id={feature.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-band py-20">
          <div className="mx-auto max-w-300 px-5 text-center sm:px-8">
            <h2 className="mb-4 font-display text-[clamp(1.8rem,4vw,2.5rem)] text-band-foreground leading-[1.1]">
              Ready to close the feedback loop?
            </h2>
            <p className="mx-auto mb-8 max-w-120 text-band-muted-foreground text-body leading-relaxed sm:text-body-lg">
              Start free. No credit card required. Upgrade when you need more.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button
                  className="h-12 rounded-full bg-band-foreground px-7 text-band text-body hover:bg-band-foreground/90"
                  tone="primary"
                  variant="solid"
                >
                  See your feedback board
                </Button>
              </Link>
              <Link
                className="font-medium text-band-muted-foreground text-body transition-colors hover:text-band-foreground"
                href="/pricing"
              >
                View pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
