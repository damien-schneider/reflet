import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Code,
  Headset,
  MegaphoneSimple,
  Robot,
  Shield,
  Sparkle,
  Target,
  Users,
  Wrench,
} from "@/components/phosphor-icons";
import { Button } from "@/components/ui/button";
import Footer from "@/features/homepage/components/footer";
import Navbar from "@/features/homepage/components/navbar";
import { generatePageMetadata } from "@/lib/seo-config";
import { cn } from "@/lib/utils";

export const metadata = generatePageMetadata({
  title: "Meet Your AI Team — 10 Autonomous Agents | Reflet",
  description:
    "Detailed breakdown of Reflet's 10 autonomous AI agents: CEO, PM, CTO, Dev, Growth, Sales, Security, Architect, Support, and Docs. Learn what each agent does, when it wakes, and what it reads and writes.",
  path: "/agents",
  keywords: [
    "AI agents",
    "AI CEO",
    "AI product manager",
    "AI developer",
    "AI sales agent",
    "AI support agent",
    "autonomous AI workforce",
    "AI employees",
  ],
});

const AGENT_DETAILS = [
  {
    role: "CEO",
    icon: Target,
    color: "text-violet-500",
    bg: "bg-violet-500/10 dark:bg-violet-500/15",
    description:
      "Sets strategic direction for your product. Generates the Company Brief from your GitHub repo — product definition, ideal customer profile, competitive landscape, and initial roadmap.",
    wakes:
      "On repo connection, quarterly strategy reviews, major milestone completions",
    reads: "GitHub repo, market data, competitive intelligence",
    writes: "Company Brief, strategic direction, product positioning",
  },
  {
    role: "PM",
    icon: Brain,
    color: "text-blue-500",
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    description:
      "Transforms market research and user feedback into actionable initiatives. Prioritizes the roadmap based on impact, effort, and strategic alignment.",
    wakes:
      "New feedback received, market research completed, initiative review cycles",
    reads: "Feedback board, market research, Company Brief, user analytics",
    writes: "Initiatives, roadmap priorities, acceptance criteria",
  },
  {
    role: "CTO",
    icon: Wrench,
    color: "text-sky-500",
    bg: "bg-sky-500/10 dark:bg-sky-500/15",
    description:
      "Translates PM initiatives into technical specifications. Makes architecture decisions and defines implementation plans that Dev can execute.",
    wakes:
      "New initiative created, architecture review needed, technical debt threshold",
    reads: "Initiatives, codebase structure, technical constraints",
    writes: "Technical specs, architecture decisions, implementation plans",
  },
  {
    role: "Dev",
    icon: Code,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    description:
      "Writes code and ships pull requests to GitHub. Implements features based on CTO specs, handles bug fixes, and maintains code quality.",
    wakes: "Spec approved, bug reported, PR review requested",
    reads: "Technical specs, codebase, PR comments, test results",
    writes: "Pull requests, code changes, test suites",
  },
  {
    role: "Growth",
    icon: MegaphoneSimple,
    color: "text-amber-500",
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    description:
      "Creates content, announces shipped features, and researches market opportunities. Monitors Reddit, Hacker News, and competitor sites for relevant conversations.",
    wakes:
      "Feature shipped, content calendar trigger, market opportunity detected",
    reads: "Changelog, shipped features, market data, social platforms",
    writes: "Blog posts, social content, feature announcements, market reports",
  },
  {
    role: "Sales",
    icon: Users,
    color: "text-rose-500",
    bg: "bg-rose-500/10 dark:bg-rose-500/15",
    description:
      "Discovers leads, researches prospects, and generates personalized outreach messages. Tracks pipeline and revenue via Stripe integration.",
    wakes: "New lead detected, prospect research trigger, pipeline review",
    reads: "Lead sources, prospect data, product usage, Stripe data",
    writes: "Outreach messages, lead profiles, pipeline updates",
  },
  {
    role: "Security",
    icon: Shield,
    color: "text-red-500",
    bg: "bg-red-500/10 dark:bg-red-500/15",
    description:
      "Scans code for vulnerabilities, checks dependencies for known CVEs, and ensures compliance with security best practices.",
    wakes: "New PR opened, dependency update, scheduled security scan",
    reads: "Codebase, dependency manifests, CVE databases",
    writes: "Security reports, vulnerability alerts, compliance status",
  },
  {
    role: "Architect",
    icon: Sparkle,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10 dark:bg-indigo-500/15",
    description:
      "Reviews code quality, enforces architecture standards, and provides detailed code review on pull requests.",
    wakes:
      "PR opened for review, architecture drift detected, quality threshold breach",
    reads: "Pull requests, codebase patterns, architecture guidelines",
    writes: "Code reviews, architecture recommendations, quality reports",
  },
  {
    role: "Support",
    icon: Headset,
    color: "text-teal-500",
    bg: "bg-teal-500/10 dark:bg-teal-500/15",
    description:
      "Triages incoming user issues, generates helpful responses, and escalates critical problems to the PM agent for roadmap consideration.",
    wakes: "New support ticket, user issue reported, escalation trigger",
    reads: "Support tickets, knowledge base, product docs, user history",
    writes: "Support responses, escalation notes, FAQ updates",
  },
  {
    role: "Docs",
    icon: Robot,
    color: "text-orange-500",
    bg: "bg-orange-500/10 dark:bg-orange-500/15",
    description:
      "Generates and maintains documentation. Keeps the knowledge base current as features ship and APIs change.",
    wakes: "Feature shipped, API changed, documentation gap detected",
    reads: "Codebase, shipped features, API definitions, existing docs",
    writes: "Documentation pages, API references, knowledge base articles",
  },
] as const;

export default function AgentsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(120,113,80,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(120,113,80,0.15),transparent)]" />
          <div className="relative mx-auto max-w-300 px-5 text-center sm:px-8">
            <span className="mb-3 block font-semibold text-[11px] text-olive-600 uppercase tracking-[0.15em] dark:text-olive-400">
              Autopilot Agents
            </span>
            <h1 className="mx-auto mb-6 max-w-180 font-display text-[clamp(2rem,5vw,3.5rem)] text-olive-950 leading-[1.1] tracking-[-0.02em] dark:text-olive-100">
              Meet your AI team
            </h1>
            <p className="mx-auto mb-10 max-w-140 text-[17px] text-muted-foreground leading-relaxed sm:text-[19px]">
              10 autonomous agents that handle strategy, development, growth,
              sales, security, and support. Each agent has a clear role, defined
              triggers, and specific inputs and outputs.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button
                  className="h-11 rounded-full px-6 text-[14px]"
                  size="lg"
                >
                  Start your AI company
                  <ArrowRight className="ml-2" size={16} />
                </Button>
              </Link>
              <Link
                className="font-medium text-[14px] text-foreground transition-opacity hover:opacity-70"
                href="/autopilot"
              >
                Autopilot overview
              </Link>
            </div>
          </div>
        </section>

        {/* Agent details */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-200 space-y-8 px-5 sm:px-8">
            {AGENT_DETAILS.map((agent) => {
              const Icon = agent.icon;
              return (
                <div
                  className="rounded-2xl border border-border/50 bg-card p-6 sm:p-8"
                  key={agent.role}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-10 items-center justify-center rounded-xl",
                        agent.bg,
                        agent.color
                      )}
                    >
                      <Icon size={20} weight="duotone" />
                    </div>
                    <h2 className="font-display font-semibold text-[20px] text-olive-950 dark:text-olive-100">
                      {agent.role}
                    </h2>
                  </div>

                  <p className="mb-6 max-w-xl text-[15px] text-muted-foreground leading-relaxed">
                    {agent.description}
                  </p>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="mb-1 font-semibold text-[12px] text-olive-600 uppercase tracking-[0.1em] dark:text-olive-400">
                        Wakes when
                      </p>
                      <p className="text-[14px] text-foreground/80 leading-relaxed">
                        {agent.wakes}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 font-semibold text-[12px] text-olive-600 uppercase tracking-[0.1em] dark:text-olive-400">
                        Reads
                      </p>
                      <p className="text-[14px] text-foreground/80 leading-relaxed">
                        {agent.reads}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 font-semibold text-[12px] text-olive-600 uppercase tracking-[0.1em] dark:text-olive-400">
                        Writes
                      </p>
                      <p className="text-[14px] text-foreground/80 leading-relaxed">
                        {agent.writes}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-olive-950 py-20 dark:bg-[#0f0e0b]">
          <div className="mx-auto max-w-300 px-5 text-center sm:px-8">
            <h2 className="mb-4 font-display text-[clamp(1.8rem,4vw,2.5rem)] text-olive-100 leading-[1.1]">
              Put your AI team to work.
            </h2>
            <p className="mx-auto mb-8 max-w-120 text-[15px] text-olive-300/80 leading-relaxed sm:text-[17px]">
              Connect your repo. Get a Company Brief. Let 10 agents run your
              product.
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
