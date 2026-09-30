import { ButtonLink } from "@ctrl-ui/react/ui/button";
import { ArrowUpRight } from "lucide-react";
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
    "Connect Reflet to your workflow with native integrations, a public API, and embeddable SDK. Sync feedback with GitHub, Slack, and other tools your team uses.",
  keywords: [
    "integrations",
    "api",
    "sdk",
    "github",
    "slack",
    "linear",
    "webhooks",
    "widgets",
  ],
  path: "/integrations",
  title: "Integrations",
});

const BUILD_INTEGRATIONS: MarketingTopic[] = [
  {
    description:
      "Import GitHub issues as feedback and publish releases as changelog entries. Issues and releases sync both ways.",
    id: "github",
    link: { href: "/docs", label: "GitHub setup guide" },
    title: "GitHub",
  },
  {
    description:
      "A TypeScript SDK with React hooks like useFeedbackList(), useVote() and useChangelog(), so feedback lives inside your app.",
    id: "sdk",
    link: { href: "/docs/sdk", label: "SDK docs" },
    title: "SDK and React hooks",
  },
  {
    description:
      "Read and write feedback, votes, comments, changelog, and roadmap. Authenticate with API keys.",
    id: "api",
    link: { href: "/docs/api", label: "API reference" },
    title: "REST API",
  },
  {
    description:
      "Feedback and changelog widgets you add with one script tag, on any site.",
    id: "widgets",
    link: { href: "/docs/widget", label: "Widget docs" },
    title: "Embeddable widgets",
  },
  {
    description:
      "One command for Claude Code, Cursor, Codex, or CI to claim the next piece of feedback, fix it, and close it: npx reflet-cli.",
    id: "cli",
    link: { href: "/docs/cli", label: "CLI docs" },
    title: "CLI for agents",
  },
];

const NOTIFICATION_INTEGRATIONS: MarketingTopic[] = [
  {
    description:
      "Emails for new feedback, status changes, and changelog updates, sent through Resend.",
    id: "email",
    title: "Email notifications",
  },
  {
    description:
      "Browser push notifications keep your team and your users up to date as things change.",
    id: "push",
    title: "Web push",
  },
];

const COMING_SOON = "Coming soon";

const UPCOMING_INTEGRATIONS: MarketingTopic[] = [
  {
    description:
      "A Slack message when feedback is submitted, voted on, or changes status.",
    id: "slack",
    status: COMING_SOON,
    title: "Slack",
  },
  {
    description:
      "Create Linear issues from feedback, with status synced both ways.",
    id: "linear",
    status: COMING_SOON,
    title: "Linear",
  },
  {
    description: "Push feedback to Jira and keep statuses in sync.",
    id: "jira",
    status: COMING_SOON,
    title: "Jira",
  },
  {
    description:
      "Feedback notifications and slash commands for your Discord community.",
    id: "discord",
    status: COMING_SOON,
    title: "Discord",
  },
  {
    description: "Connect Reflet to 5,000+ apps with triggers and actions.",
    id: "zapier",
    status: COMING_SOON,
    title: "Zapier",
  },
];

export default function IntegrationsPage() {
  return (
    <MarketingSubpage>
      <div className="marketing-section pt-16 md:pt-24">
        <MarketingPageIntro
          actions={
            <ButtonLink
              href="https://www.reflet.app/reflet"
              rel="noopener noreferrer"
              size="lg"
              target="_blank"
              tone="primary"
              variant="solid"
            >
              Request an integration{" "}
              <ArrowUpRight aria-hidden="true" size={15} />
            </ButtonLink>
          }
          align="start"
          kicker="Integrations"
          title="Connect Reflet to your workflow"
        >
          Native integrations, a public API, and an SDK, so feedback shows up
          wherever your team already works.
        </MarketingPageIntro>
        <MarketingTopicGroup
          title="Build with Reflet"
          topics={BUILD_INTEGRATIONS}
        >
          Available today, each with its own guide in the docs.
        </MarketingTopicGroup>
        <MarketingTopicGroup
          title="Stay notified"
          topics={NOTIFICATION_INTEGRATIONS}
        />
        <MarketingTopicGroup
          title="On the roadmap"
          topics={UPCOMING_INTEGRATIONS}
        >
          Tell us which one you need on the public board. Votes decide what
          ships first.
        </MarketingTopicGroup>
      </div>
    </MarketingSubpage>
  );
}
