import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Headset,
  MegaphoneSimple,
  Shield,
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
  title: "Reflet Autopilot — Visible Role Skills and Runtime Chains",
  description:
    "Connect your GitHub repo. Reflet runs one visible chain runtime with CEO, PM, CTO, Growth, Sales, Support, and Validator role skills.",
  path: "/autopilot",
  keywords: [
    "autonomous AI company",
    "AI role skills",
    "chain runtime",
    "Autopilot",
    "AI product management",
    "AI product operations",
    "AI sales workflow",
    "zero employee company",
  ],
});

const ROLE_SKILLS = [
  {
    role: "CEO skill",
    icon: Target,
    description:
      "Coordinates the chain, reads blockers, and keeps decisions visible.",
    color: "text-violet-500",
    bg: "bg-violet-500/10 dark:bg-violet-500/15",
  },
  {
    role: "PM skill",
    icon: Brain,
    description:
      "Turns validated signals into initiatives, stories, and priorities.",
    color: "text-blue-500",
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
  },
  {
    role: "CTO skill",
    icon: Wrench,
    description:
      "Maintains codebase-aware architecture, specs, and implementation plans.",
    color: "text-sky-500",
    bg: "bg-sky-500/10 dark:bg-sky-500/15",
  },
  {
    role: "Validator skill",
    icon: Shield,
    description: "Checks outputs before delivery and blocks unsafe changes.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
  },
  {
    role: "Growth skill",
    icon: MegaphoneSimple,
    description: "Researches markets, drafts content, and tracks freshness.",
    color: "text-amber-500",
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
  },
  {
    role: "Sales skill",
    icon: Users,
    description: "Finds qualified leads and prepares reviewable outreach.",
    color: "text-rose-500",
    bg: "bg-rose-500/10 dark:bg-rose-500/15",
  },
  {
    role: "Support skill",
    icon: Headset,
    description: "Triage support signals and routes product-impacting issues.",
    color: "text-teal-500",
    bg: "bg-teal-500/10 dark:bg-teal-500/15",
  },
] as const;

const LIFECYCLE_STEPS = [
  {
    step: 1,
    title: "Connect",
    description:
      "Link your GitHub repo. Autopilot scans your codebase, README, and issues to understand your product.",
  },
  {
    step: 2,
    title: "Discover",
    description:
      "Reflet generates your Company Brief — product definition, ideal customer, competitive landscape, and initial roadmap.",
  },
  {
    step: 3,
    title: "Build",
    description:
      "PM, CTO, and Validator skills turn roadmap items into specs, architecture decisions, and validated delivery plans.",
  },
  {
    step: 4,
    title: "Grow",
    description:
      "Growth, Sales, and Support skills create reviewable outputs from real triggers, not time-based routines.",
  },
] as const;

const AUTONOMY_MODES = [
  {
    title: "Supervised",
    description:
      "Role skills create pending-review drafts and wait for approval before execution.",
  },
  {
    title: "Full Auto",
    description:
      "Validated outputs can replace canonical work only after the chain passes its checks.",
  },
  {
    title: "Stopped",
    description:
      "The chain shows state and blockers without generating or replacing outputs.",
  },
] as const;

export default function AutopilotPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(120,113,80,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(120,113,80,0.15),transparent)]" />
          <div className="relative mx-auto max-w-300 px-5 text-center sm:px-8">
            <span className="mb-3 block font-semibold text-[11px] text-olive-600 uppercase tracking-[0.15em] dark:text-olive-400">
              Autopilot
            </span>
            <h1 className="mx-auto mb-6 max-w-180 font-display text-[clamp(2rem,5vw,3.5rem)] text-olive-950 leading-[1.1] tracking-[-0.02em] dark:text-olive-100">
              One visible chain. Seven role skills.
            </h1>
            <p className="mx-auto mb-10 max-w-140 text-[17px] text-muted-foreground leading-relaxed sm:text-[19px]">
              Connect your GitHub repo and Reflet generates your Company Brief
              in 5 minutes. Then the chain wakes for explicit reasons:
              dependencies, review gates, stale artifacts, approved delivery,
              support signals, and failed-execution retries.
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
                href="/pricing"
              >
                See pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Role skill cards */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-300 px-5 sm:px-8">
            <h2 className="mb-12 text-center font-display text-[clamp(1.4rem,3vw,2rem)] text-olive-950 leading-[1.15] tracking-[-0.01em] dark:text-olive-100">
              Role skills, blockers, and deliverables stay visible
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ROLE_SKILLS.map((roleSkill) => {
                const Icon = roleSkill.icon;
                return (
                  <div
                    className="rounded-2xl border border-border/50 bg-card p-5 transition-colors hover:border-border"
                    key={roleSkill.role}
                  >
                    <div
                      className={cn(
                        "mb-3 flex size-10 items-center justify-center rounded-xl",
                        roleSkill.bg,
                        roleSkill.color
                      )}
                    >
                      <Icon size={20} weight="duotone" />
                    </div>
                    <p className="mb-1 font-display font-semibold text-[15px] text-olive-950 dark:text-olive-100">
                      {roleSkill.role}
                    </p>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      {roleSkill.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Lifecycle */}
        <section className="border-border/50 border-y py-16 sm:py-24">
          <div className="mx-auto max-w-300 px-5 sm:px-8">
            <h2 className="mb-12 text-center font-display text-[clamp(1.4rem,3vw,2rem)] text-olive-950 leading-[1.15] tracking-[-0.01em] dark:text-olive-100">
              How Autopilot works
            </h2>
            <div className="mx-auto grid max-w-200 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {LIFECYCLE_STEPS.map((item) => (
                <div key={item.step}>
                  <span className="mb-2 block font-bold font-display text-[28px] text-olive-300 dark:text-olive-600">
                    {item.step}
                  </span>
                  <p className="mb-2 font-display font-semibold text-[17px] text-olive-950 dark:text-olive-100">
                    {item.title}
                  </p>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Autonomy modes */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-300 px-5 sm:px-8">
            <h2 className="mb-12 text-center font-display text-[clamp(1.4rem,3vw,2rem)] text-olive-950 leading-[1.15] tracking-[-0.01em] dark:text-olive-100">
              You're in control
            </h2>
            <div className="mx-auto grid max-w-200 gap-6 sm:grid-cols-3">
              {AUTONOMY_MODES.map((mode) => (
                <div
                  className="rounded-2xl border border-border/50 bg-card p-6"
                  key={mode.title}
                >
                  <p className="mb-2 font-display font-semibold text-[17px] text-olive-950 dark:text-olive-100">
                    {mode.title}
                  </p>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    {mode.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-olive-950 py-20 dark:bg-[#0f0e0b]">
          <div className="mx-auto max-w-300 px-5 text-center sm:px-8">
            <h2 className="mb-4 font-display text-[clamp(1.8rem,4vw,2.5rem)] text-olive-100 leading-[1.1]">
              Your visible Autopilot chain starts here.
            </h2>
            <p className="mx-auto mb-8 max-w-120 text-[15px] text-olive-300/80 leading-relaxed sm:text-[17px]">
              Connect your GitHub repo. Get a Company Brief in 5 minutes. Let
              role skills work through explicit reasons, blockers, and
              validations.
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
