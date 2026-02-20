"use client";

import {
  Article,
  BookOpen,
  CurrencyCircleDollar,
  GithubLogo,
  MapTrifold,
  Sparkle,
} from "@phosphor-icons/react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Pricing", targetId: "pricing", icon: CurrencyCircleDollar },
  { label: "Features", targetId: "features", icon: Sparkle },
  {
    label: "Roadmap",
    href: "https://www.reflet.app/reflet?view=roadmap",
    external: true,
    icon: MapTrifold,
  },
  { label: "Docs", href: "/docs", icon: BookOpen },
  { label: "Blog", href: "/blog", icon: Article },
  {
    label: "GitHub",
    href: "https://github.com/damien-schneider/reflet",
    external: true,
    icon: GithubLogo,
  },
] as const;

export default function NavbarDesktop() {
  const [hasScrolled, setHasScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setHasScrolled(latest > 50);
  });

  const scrollToSection = (targetId: string) => {
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <motion.nav
      animate={{ y: 0 }}
      className={cn(
        "sticky top-0 z-50 hidden border-border border-b transition-[height,background-color,box-shadow] duration-300 md:block",
        hasScrolled
          ? "bg-background/95 shadow-sm backdrop-blur-lg"
          : "bg-background/80 backdrop-blur-md"
      )}
      initial={{ y: -100 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "flex items-center justify-between transition-[height] duration-300",
            hasScrolled ? "h-16" : "h-20"
          )}
        >
          <div className="flex items-center gap-8">
            {/* Logo */}
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-shrink-0 items-center"
              initial={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Link
                className="font-serif text-2xl text-foreground tracking-tight transition-opacity hover:opacity-70"
                href="/"
              >
                Reflet.
              </Link>
            </motion.div>

            {/* Desktop Links */}
            <div className="flex items-center space-x-8">
              {NAV_LINKS.map((link, index) => (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  initial={{ opacity: 0, y: -20 }}
                  key={link.label}
                  transition={{ duration: 0.5, delay: 0.15 + index * 0.05 }}
                >
                  <NavLink link={link} onScrollTo={scrollToSection} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Desktop Right Actions */}
          <div className="flex items-center space-x-6">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, delay: 0.35 }}
            >
              <Link
                className="font-medium text-foreground text-sm transition-colors hover:text-muted-foreground"
                href="/dashboard"
                prefetch={true}
              >
                Log in
              </Link>
            </motion.div>
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Link href="/dashboard" prefetch={true}>
                <Button
                  className="transition-all duration-200 hover:scale-105 hover:shadow-md"
                  size="default"
                  variant="default"
                >
                  Get started
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

interface NavLinkProps {
  link: (typeof NAV_LINKS)[number];
  onScrollTo: (targetId: string) => void;
}

function NavLink({ link, onScrollTo }: NavLinkProps) {
  if ("external" in link && link.external) {
    return (
      <a
        className="group relative font-medium text-foreground text-sm transition-colors hover:text-muted-foreground"
        href={link.href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {link.label}
        <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-foreground transition-all duration-300 group-hover:w-full" />
      </a>
    );
  }

  if ("href" in link) {
    return (
      <Link
        className="group relative font-medium text-foreground text-sm transition-colors hover:text-muted-foreground"
        href={link.href}
      >
        {link.label}
        <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-foreground transition-all duration-300 group-hover:w-full" />
      </Link>
    );
  }

  if (!("targetId" in link)) {
    return null;
  }

  return (
    <button
      className="group relative font-medium text-foreground text-sm transition-colors hover:text-muted-foreground"
      onClick={() => onScrollTo(link.targetId)}
      type="button"
    >
      {link.label}
      <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-foreground transition-all duration-300 group-hover:w-full" />
    </button>
  );
}
