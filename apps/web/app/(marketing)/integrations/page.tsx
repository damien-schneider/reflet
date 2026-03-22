import {
  ArrowsClockwise,
  Bell,
  ChatTeardrop,
  Code,
  DiscordLogo,
  EnvelopeSimple,
  GithubLogo,
  Kanban,
  Layout,
  Lightning,
  Robot,
  TerminalWindow,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { H1, H2, H3, Lead } from "@/components/ui/typography";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  title: "Integrations",
  description:
    "Connect Reflet to your workflow with native integrations, a public API, and embeddable SDK. Sync feedback with GitHub, Slack, and other tools your team uses.",
  path: "/integrations",
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
});

interface Integration {
  description: string;
  href?: string;
  icon: typeof GithubLogo;
  id: string;
  title: string;
}

const AVAILABLE_INTEGRATIONS: Integration[] = [
  {
    id: "github",
    icon: GithubLogo,
    title: "GitHub",
    description:
      "Sync issues and releases bi-directionally. Import GitHub issues as feedback, auto-publish releases as changelog entries.",
    href: "/docs",
  },
  {
    id: "sdk",
    icon: Code,
    title: "SDK & React Hooks",
    description:
      "First-class TypeScript SDK with React hooks. useFeedbackList(), useVote(), useChangelog() - embed feedback natively in your app.",
    href: "/docs/sdk",
  },
  {
    id: "api",
    icon: TerminalWindow,
    title: "REST API",
    description:
      "Full CRUD API for feedback, votes, comments, changelog, and roadmap. Authenticate with API keys.",
    href: "/docs/api",
  },
  {
    id: "widgets",
    icon: Layout,
    title: "Embeddable Widgets",
    description:
      "Drop-in feedback and changelog widgets. One script tag, works on any site.",
    href: "/docs/widget",
  },
  {
    id: "email",
    icon: EnvelopeSimple,
    title: "Email Notifications",
    description:
      "Automatic email notifications for new feedback, status changes, and changelog updates via Resend.",
  },
  {
    id: "push",
    icon: Bell,
    title: "Web Push",
    description:
      "Browser push notifications to keep your team and users informed in real-time.",
  },
  {
    id: "mcp",
    icon: Robot,
    title: "MCP Server",
    description:
      "Let AI coding assistants like Cursor, Claude Code and VS Code Copilot read and manage your feedback directly via the Model Context Protocol.",
    href: "/docs/mcp",
  },
] as const;

const COMING_SOON_INTEGRATIONS: Integration[] = [
  {
    id: "slack",
    icon: ChatTeardrop,
    title: "Slack",
    description:
      "Get notified in Slack when feedback is submitted, voted on, or changes status.",
  },
  {
    id: "linear",
    icon: Lightning,
    title: "Linear",
    description:
      "Create Linear issues from feedback. Status syncs bi-directionally.",
  },
  {
    id: "jira",
    icon: Kanban,
    title: "Jira",
    description: "Push feedback to Jira. Sync statuses across both tools.",
  },
  {
    id: "discord",
    icon: DiscordLogo,
    title: "Discord",
    description:
      "Feedback notifications and slash commands for your Discord community.",
  },
  {
    id: "zapier",
    icon: ArrowsClockwise,
    title: "Zapier",
    description: "Connect Reflet to 5,000+ apps with triggers and actions.",
  },
] as const;

function AvailableCard({ integration }: { integration: Integration }) {
  const Icon = integration.icon;

  const content = (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-foreground">
        <Icon size={24} />
      </div>
      <H3 className="mb-3" variant="card">
        {integration.title}
      </H3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {integration.description}
      </p>
      {integration.href ? (
        <span className="mt-4 inline-block font-medium text-olive-600 text-sm underline underline-offset-4 transition-colors hover:text-olive-700 dark:text-olive-400 dark:hover:text-olive-300">
          View docs
        </span>
      ) : null}
    </div>
  );

  if (integration.href) {
    return <Link href={integration.href}>{content}</Link>;
  }

  return content;
}

function ComingSoonCard({ integration }: { integration: Integration }) {
  const Icon = integration.icon;

  return (
    <div className="rounded-2xl border border-border bg-card/50 p-8 opacity-70 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon size={24} />
        </div>
        <span className="rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground text-xs">
          Coming soon
        </span>
      </div>
      <H3 className="mb-3 text-muted-foreground" variant="card">
        {integration.title}
      </H3>
      <p className="text-muted-foreground/70 text-sm leading-relaxed">
        {integration.description}
      </p>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 lg:px-8">
        <div className="mb-4">
          <span className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">
            Integrations
          </span>
        </div>
        <H1 className="mb-6 max-w-3xl" variant="page">
          Connect Reflet to your workflow
        </H1>
        <Lead className="max-w-2xl">
          Native integrations, a public API, and an SDK so you can embed
          feedback anywhere.
        </Lead>
      </section>

      {/* Available Now */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <H2 className="mb-8" variant="default">
          Available Now
        </H2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {AVAILABLE_INTEGRATIONS.map((integration) => (
            <AvailableCard integration={integration} key={integration.id} />
          ))}
        </div>
      </section>

      {/* Coming Soon */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <H2 className="mb-8" variant="default">
          Coming Soon
        </H2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {COMING_SOON_INTEGRATIONS.map((integration) => (
            <ComingSoonCard integration={integration} key={integration.id} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <H2 className="mb-4" variant="default">
            Need a specific integration?
          </H2>
          <p className="mb-8 text-base text-muted-foreground sm:text-lg">
            Request it on our public feedback board.
          </p>
          <a
            className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 font-medium text-primary-foreground text-sm transition-opacity hover:opacity-90"
            href="https://www.reflet.app/reflet"
            rel="noopener noreferrer"
            target="_blank"
          >
            Request an integration
          </a>
        </div>
      </section>
    </div>
  );
}
