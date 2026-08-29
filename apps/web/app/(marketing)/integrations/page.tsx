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

const AVAILABLE: RuledEntry[] = [
  {
    description:
      "Sync issues and releases bi-directionally. Import GitHub issues as feedback, auto-publish releases as changelog entries.",
    href: "/docs",
    id: "github",
    title: "GitHub",
  },
  {
    description:
      "First-class TypeScript SDK with React hooks. useFeedbackList(), useVote(), useChangelog() — embed feedback natively in your app.",
    href: "/docs/sdk",
    id: "sdk",
    title: "SDK & React Hooks",
  },
  {
    description:
      "Full CRUD API for feedback, votes, comments, changelog, and roadmap. Authenticate with API keys.",
    href: "/docs/api",
    id: "api",
    title: "REST API",
  },
  {
    description:
      "Drop-in feedback and changelog widgets. One script tag, works on any site.",
    href: "/docs/widget",
    id: "widgets",
    title: "Embeddable Widgets",
  },
  {
    description:
      "Automatic email notifications for new feedback, status changes, and changelog updates via Resend.",
    id: "email",
    title: "Email Notifications",
  },
  {
    description:
      "Browser push notifications to keep your team and users informed in real-time.",
    id: "push",
    title: "Web Push",
  },
  {
    description:
      "Let AI coding assistants like Cursor, Claude Code and VS Code Copilot read and manage your feedback directly via the Model Context Protocol.",
    href: "/docs/mcp",
    id: "mcp",
    title: "MCP Server",
  },
];

const PLANNED: RuledEntry[] = [
  {
    description:
      "Get notified in Slack when feedback is submitted, voted on, or changes status.",
    id: "slack",
    marker: "Soon",
    title: "Slack",
  },
  {
    description:
      "Create Linear issues from feedback. Status syncs bi-directionally.",
    id: "linear",
    marker: "Soon",
    title: "Linear",
  },
  {
    description: "Push feedback to Jira. Sync statuses across both tools.",
    id: "jira",
    marker: "Soon",
    title: "Jira",
  },
  {
    description:
      "Feedback notifications and slash commands for your Discord community.",
    id: "discord",
    marker: "Soon",
    title: "Discord",
  },
  {
    description: "Connect Reflet to 5,000+ apps with triggers and actions.",
    id: "zapier",
    marker: "Soon",
    title: "Zapier",
  },
];

export default function IntegrationsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="mx-auto max-w-220 px-5 pt-28 pb-24 sm:px-8 sm:pt-36">
          <H1 className="max-w-180" variant="landing">
            Connect Reflet to your workflow
          </H1>
          <Lead className="mt-8 max-w-140">
            Native integrations, a public API, and an SDK so you can embed
            feedback anywhere.
          </Lead>
        </section>

        <section className="mx-auto max-w-220 px-5 pb-28 sm:px-8 sm:pb-36">
          <H2 className="mb-14 sm:mb-16" variant="landing">
            Available now
          </H2>
          <RuledList entries={AVAILABLE} />
        </section>

        <section className="mx-auto max-w-220 px-5 pb-8 sm:px-8">
          <H2 className="mb-14 sm:mb-16" variant="landing">
            On the way
          </H2>
          <RuledList entries={PLANNED} />
        </section>

        <MarketingCta
          actions={
            <a
              className={CTA_PRIMARY_CLASS}
              href="https://www.reflet.app/reflet"
              rel="noopener noreferrer"
              target="_blank"
            >
              Request an integration
            </a>
          }
          title="Missing the one you need?"
        />
      </main>
      <Footer />
    </div>
  );
}
