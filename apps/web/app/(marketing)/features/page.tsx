import Link from "next/link";

import { ArrowRight } from "@/components/phosphor-icons";
import { Button } from "@/components/ui/button";
import { H1, H2, Lead } from "@/components/ui/typography";
import { FeatureMockup } from "@/features/homepage/components/feature-mockups";
import Footer from "@/features/homepage/components/footer";
import MarketingCta, {
  CTA_PRIMARY_CLASS,
  CTA_SECONDARY_CLASS,
} from "@/features/homepage/components/marketing/marketing-cta";
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
    description:
      "Auto-tag, score priority, estimate complexity, and detect duplicates — all in milliseconds.",
    details: [
      "Automatic categorization and tagging of incoming feedback",
      "Priority scoring based on user sentiment and request frequency",
      "Complexity estimation to help plan sprints",
      "Duplicate detection with configurable match threshold",
      "Confidence scores so you always stay in control",
    ],
    id: "ai",
    title: "AI-Powered Triage",
  },
  {
    description:
      "Drop a script tag into your app. Users submit feedback without leaving your product.",
    details: [
      "One-line script tag installation — no build step needed",
      "Full React SDK with useFeedbackList(), useVote(), and more",
      "Customizable theme to match your brand",
      "Changelog widget to announce releases in-app",
      "TypeScript-first with full type definitions",
    ],
    id: "widget",
    title: "Embeddable Widget",
  },
  {
    description:
      "Link feedback to issues. When a PR merges, the linked request moves to shipped.",
    details: [
      "Create GitHub issues directly from feedback items",
      "Automatic status sync — merged PRs update feedback status",
      "Link multiple feedback items to a single issue",
      "Auto-generate changelog entries from merged PRs",
      "Works with GitHub Actions and CI/CD pipelines",
    ],
    id: "github",
    title: "Two-Way GitHub Sync",
  },
  {
    description:
      "Built on Convex — votes, comments, and status changes sync instantly across all devices.",
    details: [
      "Zero-latency updates across all connected clients",
      "Live vote counts and comment threads",
      "Instant status change notifications",
      "Multiplayer editing without conflicts",
      "Optimistic UI for snappy interactions",
    ],
    id: "realtime",
    title: "Real-Time Everything",
  },
  {
    description:
      "Full CRUD API for programmatic access. Webhooks fire on every status transition.",
    details: [
      "RESTful endpoints for feedback, votes, and comments",
      "Webhook notifications for status changes and new items",
      "API key authentication with granular permissions",
      "Rate limiting with generous free-tier quotas",
      "OpenAPI specification for easy integration",
    ],
    id: "api",
    title: "REST API & Webhooks",
  },
] as const;

export default function FeaturesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <section className="relative overflow-hidden pt-32 pb-28 sm:pt-40 sm:pb-36">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,color-mix(in_oklch,var(--color-olive-600)_9%,transparent),transparent)]" />
          <div className="paper-grain pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-multiply [mask-image:linear-gradient(to_bottom,black_60%,transparent)] dark:opacity-[0.05] dark:mix-blend-screen" />

          <div className="relative mx-auto max-w-220 px-5 text-center sm:px-8">
            <H1 className="mx-auto max-w-200" variant="landing">
              Everything you need to ship what users actually want.
            </H1>
            <Lead className="mx-auto mt-8 max-w-140 sm:mt-9">
              From collecting raw feedback to publishing changelogs — Reflet
              handles the full loop with AI triage, real-time sync, and
              developer-friendly tools. Built for teams that ship fast.
            </Lead>
            <div className="mt-14 flex flex-wrap items-center justify-center gap-3 sm:mt-16">
              <Button
                className="group h-11 rounded-full px-6 text-[15px]"
                render={<Link href="/dashboard" />}
              >
                Get started free
                <ArrowRight
                  className="ml-1 transition-transform duration-300 group-hover:translate-x-0.5"
                  size={15}
                />
              </Button>
              <Link
                className="flex h-11 items-center rounded-full border border-border px-5 font-medium text-[15px] text-foreground/80 transition-colors hover:border-foreground/30 hover:text-foreground"
                href="/docs"
              >
                Read the docs
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-220 px-5 pb-8 sm:px-8">
          <div className="grid gap-32 sm:gap-44">
            {FEATURES.map((feature, index) => (
              <div
                className={`grid items-start gap-10 lg:grid-cols-2 lg:gap-16 ${index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}
                key={feature.id}
              >
                <div className="min-w-0">
                  <H2 variant="landing">{feature.title}</H2>
                  <p className="mt-6 max-w-md text-[15px] text-muted-foreground leading-relaxed sm:text-[17px]">
                    {feature.description}
                  </p>
                  <ul className="mt-10 border-border/70 border-t">
                    {feature.details.map((detail) => (
                      <li
                        className="border-border/70 border-b py-3.5 text-[14px] text-foreground/80"
                        key={detail}
                      >
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="-mx-5 min-w-0 sm:mx-0">
                  <FeatureMockup id={feature.id} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <MarketingCta
          actions={
            <>
              <Link className={CTA_PRIMARY_CLASS} href="/dashboard">
                See your feedback board
              </Link>
              <Link className={CTA_SECONDARY_CLASS} href="/pricing">
                View pricing
              </Link>
            </>
          }
          title="Ready to close the feedback loop?"
        />
      </main>

      <Footer />
    </div>
  );
}
