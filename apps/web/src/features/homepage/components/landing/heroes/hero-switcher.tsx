"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { HERO_PROPOSALS } from "./proposals";

const SOLO_BASE = "/heroes";
const FULL_BASE = "/hero-preview";

const PILL = "shrink-0 rounded-full px-3 py-1.5 text-[12px] transition-colors";
const ACTIVE_PILL =
  "bg-olive-600 text-olive-50 dark:bg-olive-400 dark:text-olive-950";
const IDLE_PILL = "text-muted-foreground hover:text-foreground";

export default function HeroSwitcher() {
  const pathname = usePathname();
  const inFullPage = pathname.startsWith(FULL_BASE);
  const base = inFullPage ? FULL_BASE : SOLO_BASE;
  const activeSlug = pathname.split("/")[2] ?? "";

  return (
    <nav className="no-scrollbar fixed bottom-5 left-1/2 z-100 flex max-w-[94vw] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full border border-border/70 bg-card/85 p-1 shadow-[0_18px_50px_-18px_rgba(20,18,11,0.45)] backdrop-blur-md">
      <Link
        className={cn(
          PILL,
          "font-mono text-[11px]",
          pathname === SOLO_BASE ? ACTIVE_PILL : IDLE_PILL
        )}
        href={SOLO_BASE}
      >
        All
      </Link>

      {HERO_PROPOSALS.map((proposal) => (
        <Link
          className={cn(
            PILL,
            activeSlug === proposal.slug ? ACTIVE_PILL : IDLE_PILL
          )}
          href={`${base}/${proposal.slug}`}
          key={proposal.slug}
        >
          {proposal.name}
        </Link>
      ))}

      {activeSlug ? (
        <Link
          className={cn(
            PILL,
            "ml-1 border border-border/70 font-mono text-[11px]",
            IDLE_PILL
          )}
          href={`${inFullPage ? SOLO_BASE : FULL_BASE}/${activeSlug}`}
        >
          {inFullPage ? "Hero only" : "Full page"}
        </Link>
      ) : null}
    </nav>
  );
}
