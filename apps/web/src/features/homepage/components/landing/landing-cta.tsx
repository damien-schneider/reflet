/*
 * Final CTA — confident, calm, one strong action.
 * Full-bleed warm background with editorial typography.
 */

import Link from "next/link";
import { AnimateOnView } from "@/components/animate-on-view";
import { ArrowRight, GithubLogo } from "@/components/phosphor-icons";
import { Button } from "@/components/ui/button";

export default function LandingCTA() {
  return (
    <section className="relative overflow-hidden bg-olive-950 py-24 sm:py-32 dark:bg-[#0f0e0b]">
      {/* Subtle radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(120,113,80,0.12),transparent)]" />

      <div className="relative mx-auto max-w-300 px-5 sm:px-8">
        <AnimateOnView className="max-w-160">
          <h2 className="mb-6 font-display text-[clamp(2rem,5vw,3.5rem)] text-olive-100 leading-[1.1] tracking-[-0.02em]">
            Stop guessing what to build next.
          </h2>
          <p className="mb-10 text-[17px] text-olive-300/80 leading-relaxed sm:text-[19px]">
            Your users already know. Reflet collects their voice, triages with
            AI, and notifies them the moment you ship. Free to start, open
            source forever.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link href="/dashboard">
              <Button className="h-12 rounded-full bg-olive-100 px-7 text-[15px] text-olive-950 hover:bg-white">
                See your feedback board
                <ArrowRight className="ml-1.5" size={16} />
              </Button>
            </Link>
            <a
              className="flex items-center gap-2 font-medium text-[14px] text-olive-300 transition-colors hover:text-olive-100"
              href="https://github.com/damien-schneider/reflet"
              rel="noopener noreferrer"
              target="_blank"
            >
              <GithubLogo size={16} weight="fill" />
              View on GitHub
            </a>
          </div>
        </AnimateOnView>
      </div>
    </section>
  );
}
