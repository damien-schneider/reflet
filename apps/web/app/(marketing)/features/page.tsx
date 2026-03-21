import Link from "next/link";
import {
  Brain,
  ChatCircleDots,
  Code,
  GithubLogo,
  Lightning,
} from "@/components/phosphor-icons";
import { Button } from "@/components/ui/button";
import { FeatureMockup } from "@/features/homepage/components/feature-mockups";
import Footer from "@/features/homepage/components/footer";
import Navbar from "@/features/homepage/components/navbar";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata = generatePageMetadata({
  title: "Features | Reflet - Built for Developer-Led SaaS Teams",
  description:
    "AI-powered triage, embeddable widget, two-way GitHub sync, real-time collaboration, and REST API. Everything developer-led SaaS teams need to close the feedback loop.",
  path: "/features",
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
});

const FEATURES = [
  {
    id: "ai",
    icon: Brain,
    accent: "text-violet-500",
    accentBg: "bg-violet-500/10 dark:bg-violet-500/15",
    title: "AI-Powered Triage",
    description:
      "Auto-tag, score priority, estimate complexity, and detect duplicates — all in milliseconds.",
    details: [
      "Automatic categorization and tagging of incoming feedback",
      "Priority scoring based on user sentiment and request frequency",
      "Complexity estimation to help plan sprints",
      "Duplicate detection with configurable match threshold",
      "Confidence scores so you always stay in control",
    ],
  },
  {
    id: "widget",
    icon: ChatCircleDots,
    accent: "text-emerald-500",
    accentBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    title: "Embeddable Widget",
    description:
      "Drop a script tag into your app. Users submit feedback without leaving your product.",
    details: [
      "One-line script tag installation — no build step needed",
      "Full React SDK with useFeedbackList(), useVote(), and more",
      "Customizable theme to match your brand",
      "Changelog widget to announce releases in-app",
      "TypeScript-first with full type definitions",
    ],
  },
  {
    id: "github",
    icon: GithubLogo,
    accent: "text-foreground",
    accentBg: "bg-[#f0efea] dark:bg-[#ffffff08]",
    title: "Two-Way GitHub Sync",
    description:
      "Link feedback to issues. When a PR merges, the linked request moves to shipped.",
    details: [
      "Create GitHub issues directly from feedback items",
      "Automatic status sync — merged PRs update feedback status",
      "Link multiple feedback items to a single issue",
      "Auto-generate changelog entries from merged PRs",
      "Works with GitHub Actions and CI/CD pipelines",
    ],
  },
  {
    id: "realtime",
    icon: Lightning,
    accent: "text-amber-500",
    accentBg: "bg-amber-500/10 dark:bg-amber-500/15",
    title: "Real-Time Everything",
    description:
      "Built on Convex — votes, comments, and status changes sync instantly across all devices.",
    details: [
      "Zero-latency updates across all connected clients",
      "Live vote counts and comment threads",
      "Instant status change notifications",
      "Multiplayer editing without conflicts",
      "Optimistic UI for snappy interactions",
    ],
  },
  {
    id: "api",
    icon: Code,
    accent: "text-sky-500",
    accentBg: "bg-sky-500/10 dark:bg-sky-500/15",
    title: "REST API & Webhooks",
    description:
      "Full CRUD API for programmatic access. Webhooks fire on every status transition.",
    details: [
      "RESTful endpoints for feedback, votes, and comments",
      "Webhook notifications for status changes and new items",
      "API key authentication with granular permissions",
      "Rate limiting with generous free-tier quotas",
      "OpenAPI specification for easy integration",
    ],
  },
] as const;

export default function FeaturesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(120,113,80,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(120,113,80,0.15),transparent)]" />
          <div className="relative mx-auto max-w-300 px-5 text-center sm:px-8">
            <span className="mb-3 block font-semibold text-[11px] text-olive-600 uppercase tracking-[0.15em] dark:text-olive-400">
              Built for developer-led SaaS teams
            </span>
            <h1 className="mx-auto mb-6 max-w-180 font-display text-[clamp(2rem,5vw,3.5rem)] text-olive-950 leading-[1.1] tracking-[-0.02em] dark:text-olive-100">
              Everything you need to ship what users actually want.
            </h1>
            <p className="mx-auto mb-10 max-w-140 text-[17px] text-muted-foreground leading-relaxed sm:text-[19px]">
              From collecting raw feedback to publishing changelogs — Reflet
              handles the full loop with AI triage, real-time sync, and
              developer-friendly tools. Built for teams that ship fast.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button
                  className="h-11 rounded-full px-6 text-[14px]"
                  size="lg"
                >
                  Get started free
                </Button>
              </Link>
              <Link
                className="font-medium text-[14px] text-foreground transition-opacity hover:opacity-70"
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
                        <h2 className="font-display text-[clamp(1.4rem,3vw,2rem)] text-olive-950 leading-[1.15] tracking-[-0.01em] dark:text-olive-100">
                          {feature.title}
                        </h2>
                      </div>
                      <p className="mb-6 max-w-md text-[15px] text-muted-foreground leading-relaxed sm:text-[17px]">
                        {feature.description}
                      </p>
                      <ul className="space-y-3">
                        {feature.details.map((detail) => (
                          <li
                            className="flex items-start gap-3 text-[14px] text-foreground/80"
                            key={detail}
                          >
                            <span className="mt-2 block size-1.5 shrink-0 rounded-full bg-olive-600 dark:bg-olive-400" />
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
        <section className="bg-olive-950 py-20 dark:bg-[#0f0e0b]">
          <div className="mx-auto max-w-300 px-5 text-center sm:px-8">
            <h2 className="mb-4 font-display text-[clamp(1.8rem,4vw,2.5rem)] text-olive-100 leading-[1.1]">
              Ready to close the feedback loop?
            </h2>
            <p className="mx-auto mb-8 max-w-120 text-[15px] text-olive-300/80 leading-relaxed sm:text-[17px]">
              Start free. No credit card required. Upgrade when you need more.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button className="h-12 rounded-full bg-olive-100 px-7 text-[15px] text-olive-950 hover:bg-white">
                  See your feedback board
                </Button>
              </Link>
              <Link
                className="font-medium text-[14px] text-olive-300 transition-colors hover:text-olive-100"
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
