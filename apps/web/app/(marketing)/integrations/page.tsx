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
import Footer from "@/features/homepage/components/footer";
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

interface Integration {
  description: string;
  href?: string;
  icon: typeof GithubLogo;
  id: string;
  title: string;
}

const AVAILABLE_INTEGRATIONS: Integration[] = [
  {
    description:
      "Sync issues and releases bi-directionally. Import GitHub issues as feedback, auto-publish releases as changelog entries.",
    href: "/docs",
    icon: GithubLogo,
    id: "github",
    title: "GitHub",
  },
  {
    description:
      "First-class TypeScript SDK with React hooks. useFeedbackList(), useVote(), useChangelog() - embed feedback natively in your app.",
    href: "/docs/sdk",
    icon: Code,
    id: "sdk",
    title: "SDK & React Hooks",
  },
  {
    description:
      "Full CRUD API for feedback, votes, comments, changelog, and roadmap. Authenticate with API keys.",
    href: "/docs/api",
    icon: TerminalWindow,
    id: "api",
    title: "REST API",
  },
  {
    description:
      "Drop-in feedback and changelog widgets. One script tag, works on any site.",
    href: "/docs/widget",
    icon: Layout,
    id: "widgets",
    title: "Embeddable Widgets",
  },
  {
    description:
      "Automatic email notifications for new feedback, status changes, and changelog updates via Resend.",
    icon: EnvelopeSimple,
    id: "email",
    title: "Email Notifications",
  },
  {
    description:
      "Browser push notifications to keep your team and users informed in real-time.",
    icon: Bell,
    id: "push",
    title: "Web Push",
  },
  {
    description:
      "Let AI coding assistants like Cursor, Claude Code and VS Code Copilot read and manage your feedback directly via the Model Context Protocol.",
    href: "/docs/mcp",
    icon: Robot,
    id: "mcp",
    title: "MCP Server",
  },
] as const;

const COMING_SOON_INTEGRATIONS: Integration[] = [
  {
    description:
      "Get notified in Slack when feedback is submitted, voted on, or changes status.",
    icon: ChatTeardrop,
    id: "slack",
    title: "Slack",
  },
  {
    description:
      "Create Linear issues from feedback. Status syncs bi-directionally.",
    icon: Lightning,
    id: "linear",
    title: "Linear",
  },
  {
    description: "Push feedback to Jira. Sync statuses across both tools.",
    icon: Kanban,
    id: "jira",
    title: "Jira",
  },
  {
    description:
      "Feedback notifications and slash commands for your Discord community.",
    icon: DiscordLogo,
    id: "discord",
    title: "Discord",
  },
  {
    description: "Connect Reflet to 5,000+ apps with triggers and actions.",
    icon: ArrowsClockwise,
    id: "zapier",
    title: "Zapier",
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
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 lg:px-8">
          <H1 className="mb-6 max-w-3xl" variant="page">
            Connect Reflet to your workflow
          </H1>
          <Lead className="max-w-2xl">
            Native integrations, a public API, and an SDK so you can embed
            feedback anywhere.
          </Lead>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <H2 className="mb-8" variant="default">
            Available now
          </H2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {AVAILABLE_INTEGRATIONS.map((integration) => (
              <AvailableCard integration={integration} key={integration.id} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <H2 className="mb-8" variant="default">
            Coming soon
          </H2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {COMING_SOON_INTEGRATIONS.map((integration) => (
              <ComingSoonCard integration={integration} key={integration.id} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
            <H2 className="mb-8" variant="default">
              Need a specific integration?
            </H2>
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
      </main>
      <Footer />
    </div>
  );
}
