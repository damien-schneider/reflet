import {
  BrainIcon as Brain,
  CodeIcon as Code,
  GitBranchIcon as GitBranch,
  KanbanIcon as Kanban,
  PlugsIcon as Plugs,
  TrayIcon as Tray,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Footer from "@/features/homepage/components/footer";
import Navbar from "@/features/homepage/components/navbar";
import { generatePageMetadata } from "@/lib/seo-config";
import { cn } from "@/lib/utils";

export const metadata = generatePageMetadata({
  title: "Features | Reflet — Autonomous AI Company Platform",
  description:
    "7 AI agents that autonomously run your product — CEO, PM, CTO, Dev, Growth, Sales, Support. Shared board, knowledge base, inbox, work board, and provider-agnostic coding.",
  path: "/features",
  keywords: [
    "autonomous AI agents",
    "AI company platform",
    "AI employees",
    "AI product management",
    "AI developer",
    "shared board",
    "knowledge base",
    "work board",
    "provider-agnostic coding",
    "autonomous AI company",
  ],
});

const FEATURES = [
  {
    id: "shared-board",
    icon: GitBranch,
    accent: "text-emerald-500",
    accentBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    title: "The Shared Board",
    description:
      "No orchestrator. Agents communicate through a shared database — exactly like a real company.",
    details: [
      "Agents read and write to a single source of truth",
      "PM sees Growth's research; CTO sees PM's initiatives; Dev sees CTO's specs",
      "Changes cascade automatically — no manual handoffs",
      "Full audit trail of every agent action",
      "You observe the entire company's activity in real time",
    ],
  },
  {
    id: "knowledge-base",
    icon: Brain,
    accent: "text-violet-500",
    accentBg: "bg-violet-500/10 dark:bg-violet-500/15",
    title: "Knowledge Base",
    description:
      "7 living documents auto-generated at onboarding and kept current as your product evolves.",
    details: [
      "Company Brief: product definition, ICP, competitive landscape",
      "Roadmap: current initiatives ranked by impact and effort",
      "Architecture Overview: codebase structure and key decisions",
      "Market Report: ongoing research by the Growth agent",
      "Change cascades — updating one document notifies dependent agents",
    ],
  },
  {
    id: "inbox",
    icon: Tray,
    accent: "text-amber-500",
    accentBg: "bg-amber-500/10 dark:bg-amber-500/15",
    title: "The Inbox",
    description:
      "Every agent output that needs your attention lands here. Approve, edit, reject, or snooze.",
    details: [
      "Approve agent proposals with one click",
      "Edit drafts before they're published or executed",
      "Reject with a reason — agents learn from feedback",
      "Snooze items to review later, nothing gets lost",
      "Unified queue across all 7 agents",
    ],
  },
  {
    id: "work-board",
    icon: Kanban,
    accent: "text-sky-500",
    accentBg: "bg-sky-500/10 dark:bg-sky-500/15",
    title: "Work Board",
    description:
      "Unified hierarchy: Initiative → Story → Spec → Task. Track the full lifecycle of every idea.",
    details: [
      "Initiatives created by PM, broken into stories",
      "Specs written by CTO, attached to stories",
      "Tasks generated for Dev with clear acceptance criteria",
      "Status flows automatically as agents complete work",
      "See exactly what every agent is working on right now",
    ],
  },
  {
    id: "coding",
    icon: Code,
    accent: "text-rose-500",
    accentBg: "bg-rose-500/10 dark:bg-rose-500/15",
    title: "Provider-Agnostic Coding",
    description:
      "Choose your preferred coding engine. Built-in, GitHub Copilot, OpenAI Codex, or Claude Code.",
    details: [
      "Built-in coding adapter — no extra setup needed",
      "GitHub Copilot integration for Copilot subscribers",
      "OpenAI Codex support for GPT-4o code generation",
      "Claude Code adapter for Anthropic-powered coding",
      "Switch providers without changing your workflow",
    ],
  },
  {
    id: "integrations",
    icon: Plugs,
    accent: "text-foreground",
    accentBg: "bg-[#f0efea] dark:bg-[#ffffff08]",
    title: "Deep Integrations",
    description:
      "Connect your GitHub repo, Stripe account, and existing tools. Agents work with your stack.",
    details: [
      "GitHub: agents read code, create PRs, sync issues",
      "Stripe: Sales tracks MRR, ARR, and churn in real time",
      "SDK & React hooks for embedding in your product",
      "REST API for programmatic access to all agent data",
      "MCP Server for AI coding assistant integration",
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
              Autonomous AI company
            </span>
            <h1 className="mx-auto mb-6 max-w-180 font-display text-[clamp(2rem,5vw,3.5rem)] text-olive-950 leading-[1.1] tracking-[-0.02em] dark:text-olive-100">
              7 AI agents built to run your product.
            </h1>
            <p className="mx-auto mb-10 max-w-140 text-[17px] text-muted-foreground leading-relaxed sm:text-[19px]">
              Reflet Autopilot gives you a shared board where agents
              collaborate, a knowledge base that stays current, an inbox for key
              decisions, and a work board tracking every initiative from idea to
              shipped code.
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
                href="/autopilot"
              >
                See how it works
              </Link>
            </div>
          </div>
        </section>

        {/* Feature list */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-300 px-5 sm:px-8">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    className="rounded-2xl border border-border/50 bg-card p-6"
                    key={feature.id}
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <div
                        className={cn(
                          "flex size-10 items-center justify-center rounded-xl",
                          feature.accentBg,
                          feature.accent
                        )}
                      >
                        <Icon size={20} weight="duotone" />
                      </div>
                      <h2 className="font-display font-semibold text-[17px] text-olive-950 leading-[1.15] dark:text-olive-100">
                        {feature.title}
                      </h2>
                    </div>
                    <p className="mb-5 text-[14px] text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                    <ul className="space-y-2">
                      {feature.details.map((detail) => (
                        <li
                          className="flex items-start gap-2.5 text-[13px] text-foreground/75"
                          key={detail}
                        >
                          <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-olive-600 dark:bg-olive-400" />
                          {detail}
                        </li>
                      ))}
                    </ul>
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
              Ready to start your AI company?
            </h2>
            <p className="mx-auto mb-8 max-w-120 text-[15px] text-olive-300/80 leading-relaxed sm:text-[17px]">
              Connect your repo. 7 AI agents start in 5 minutes. Free tier
              available.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button className="h-12 rounded-full bg-olive-100 px-7 text-[15px] text-olive-950 hover:bg-white">
                  Start your AI company
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
