"use client";

import { GithubLogo } from "@phosphor-icons/react";
import { useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { useState } from "react";

import { RefletWordmark } from "@/components/reflet-mark";
import { Button } from "@/components/ui/button";
import { useThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
] as const;

export default function NavbarDesktop() {
  const { scrollY } = useScroll();
  const { cycleTheme, Icon: ThemeIcon, label: themeLabel } = useThemeToggle();
  const [isLifted, setIsLifted] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => setIsLifted(y > 24));

  return (
    <nav
      aria-label="Main"
      className={cn(
        "sticky top-0 z-50 hidden transition-[background-color,border-color,backdrop-filter] duration-500 md:block",
        isLifted
          ? "border-border/70 border-b bg-background/80 backdrop-blur-xl"
          : "border-transparent border-b bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[96rem] items-center justify-between px-5 sm:px-8 lg:px-12">
        <div className="flex items-center gap-10">
          <Link
            aria-label="Reflet home"
            className="transition-opacity hover:opacity-70"
            href="/"
          >
            <RefletWordmark />
          </Link>
          <div className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                className="group relative px-3 py-1.5 font-medium text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                href={link.href}
                key={link.href}
              >
                {link.label}
                <span className="absolute bottom-0 left-1/2 h-px w-0 -translate-x-1/2 bg-foreground/40 transition-[width] duration-300 ease-out group-hover:w-[calc(100%-24px)]" />
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            aria-label={`Theme: ${themeLabel}. Click to change.`}
            className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={cycleTheme}
            type="button"
          >
            <ThemeIcon className="size-[18px]" />
          </button>
          <a
            aria-label="GitHub repository"
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            href="https://github.com/damien-schneider/reflet"
            rel="noopener noreferrer"
            target="_blank"
          >
            <GithubLogo className="size-[18px]" />
          </a>
          <Link
            className="px-3 font-medium text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            href="/dashboard"
            prefetch={true}
          >
            Log in
          </Link>
          <Button
            className="h-9 rounded-full px-4 text-[13px]"
            render={<Link href="/dashboard" prefetch={true} />}
          >
            Get started
          </Button>
        </div>
      </div>
    </nav>
  );
}
