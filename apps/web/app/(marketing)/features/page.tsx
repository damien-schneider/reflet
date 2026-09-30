import { ButtonLink } from "@ctrl-ui/react/ui/button";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import {
  FeatureMockup,
  type FeatureMockupId,
} from "@/features/homepage/components/feature-mockups";
import {
  MarketingPageIntro,
  MarketingSubpage,
} from "@/features/homepage/components/marketing-subpage";
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
  title: "Features",
});

interface Feature {
  description: string;
  details: readonly string[];
  id: FeatureMockupId;
  kicker: string;
  title: string;
}

const FEATURES: readonly Feature[] = [
  {
    description:
      "Every new request gets tagged, scored, and sized, and duplicates are flagged before they pile up.",
    details: [
      "Categorizes and tags incoming feedback",
      "Scores priority from sentiment and how often it’s requested",
      "Estimates complexity to help plan sprints",
      "Detects duplicates with a match threshold you control",
      "Shows a confidence score, so you make the final call",
    ],
    id: "ai",
    kicker: "Triage",
    title: "AI does the sorting",
  },
  {
    description:
      "Add one script tag or the React SDK. Users send feedback without leaving your product.",
    details: [
      "One script tag, no build step",
      "React SDK with useFeedbackList(), useVote(), and more",
      "Theme it to match your brand",
      "Changelog widget to announce releases in the app",
      "TypeScript-first, with full type definitions",
    ],
    id: "widget",
    kicker: "Collect",
    title: "Feedback inside your app",
  },
  {
    description:
      "Link feedback to issues. When the pull request merges, the request moves to shipped.",
    details: [
      "Create GitHub issues straight from feedback",
      "Merged pull requests update feedback status",
      "Link several requests to a single issue",
      "Draft changelog entries from merged pull requests",
      "Works with GitHub Actions and your CI/CD pipeline",
    ],
    id: "github",
    kicker: "Ship",
    title: "Two-way GitHub sync",
  },
  {
    description:
      "Built on Convex. Votes, comments, and status changes show up on every screen as they happen.",
    details: [
      "Updates reach every connected client instantly",
      "Live vote counts and comment threads",
      "Status changes appear without a refresh",
      "Several people can edit without conflicts",
      "Optimistic UI, so every click responds right away",
    ],
    id: "realtime",
    kicker: "Collaborate",
    title: "Everything updates live",
  },
  {
    description:
      "Read and write everything through the API. Webhooks fire on every status change.",
    details: [
      "REST endpoints for feedback, votes, and comments",
      "Webhooks for status changes and new items",
      "API keys with granular permissions",
      "Rate limits with generous free-tier quotas",
      "OpenAPI specification",
    ],
    id: "api",
    kicker: "Extend",
    title: "REST API and webhooks",
  },
];

function FeatureRow({ feature, index }: { feature: Feature; index: number }) {
  return (
    <article
      className="grid grid-cols-1 items-center gap-10 border-(--marketing-hairline) border-t py-16 lg:grid-cols-2 lg:gap-20 lg:py-24"
      id={feature.id}
    >
      <div className={index % 2 === 1 ? "lg:order-2" : undefined}>
        <span className="marketing-kicker">{feature.kicker}</span>
        <h2 className="text-balance text-heading-2 tracking-[-0.03em] md:text-heading-1">
          {feature.title}
        </h2>
        <p className="mt-4 max-w-md text-pretty text-body-lg text-muted-foreground leading-relaxed">
          {feature.description}
        </p>
        <ul className="mt-8 max-w-md list-disc space-y-2.5 ps-5 text-body-lg leading-relaxed marker:text-muted-foreground">
          {feature.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      </div>
      <FeatureMockup id={feature.id} />
    </article>
  );
}

export default function FeaturesPage() {
  return (
    <MarketingSubpage>
      <div className="marketing-section pt-16 md:pt-24">
        <MarketingPageIntro
          actions={
            <>
              <ButtonLink
                render={<Link href="/dashboard" />}
                size="lg"
                tone="primary"
                variant="solid"
              >
                Start for free <ArrowUpRight aria-hidden="true" size={15} />
              </ButtonLink>
              <Link className="marketing-text-link" href="/docs">
                Read the docs
              </Link>
            </>
          }
          kicker="Built for developer-led SaaS teams"
          title="Ship what your users actually asked for"
        >
          From the first request to the changelog entry, Reflet handles the
          whole loop: AI triage, live sync, and tools developers like using.
        </MarketingPageIntro>
        {FEATURES.map((feature, index) => (
          <FeatureRow feature={feature} index={index} key={feature.id} />
        ))}
      </div>
    </MarketingSubpage>
  );
}
