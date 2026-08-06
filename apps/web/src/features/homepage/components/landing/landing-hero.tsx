import Link from "next/link";
import {
  ArrowRight,
  CaretRight,
  GithubLogo,
} from "@/components/phosphor-icons";
import { Button } from "@/components/ui/button";
import { H1, Lead } from "@/components/ui/typography";

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(120,113,80,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(120,113,80,0.15),transparent)]" />

      <div className="relative mx-auto max-w-300 px-5 py-24 sm:px-8 sm:py-32">
        <a
          className="hero-animate hero-fade-up hero-delay-0 group mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 transition-colors hover:border-olive-600/30 dark:hover:border-olive-400/30"
          href="https://github.com/damien-schneider/reflet"
          rel="noopener noreferrer"
          target="_blank"
        >
          <GithubLogo className="text-foreground" size={14} weight="fill" />
          <span className="font-medium text-[13px] text-foreground">
            Open source on GitHub
          </span>
          <CaretRight
            className="text-muted-foreground transition-transform group-hover:translate-x-0.5"
            size={12}
          />
        </a>

        <H1 className="mb-6 max-w-205" variant="landing">
          Your users are talking.
          <br />
          <span className="text-muted-foreground">Are you listening?</span>
        </H1>

        <Lead className="mb-10 max-w-130" size="lg">
          Collect every request, let AI triage the noise, and close the loop
          when you ship.
        </Lead>

        <div className="hero-animate hero-fade-up hero-delay-3 flex flex-wrap items-center gap-4">
          <Link href="/dashboard">
            <Button
              className="h-11 rounded-full px-6 text-[14px]"
              size="lg"
              variant="default"
            >
              See your feedback board
              <ArrowRight className="ml-1" size={16} />
            </Button>
          </Link>
          <Link
            className="flex items-center gap-1.5 font-medium text-[14px] text-foreground transition-opacity hover:opacity-70"
            href="/docs"
          >
            Read the docs
            <CaretRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
