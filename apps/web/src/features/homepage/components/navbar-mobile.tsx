"use client";

import {
  Article,
  CurrencyCircleDollar,
  GithubLogo,
  Sparkle,
  User,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Pricing", targetId: "pricing", icon: CurrencyCircleDollar },
  { label: "Features", targetId: "features", icon: Sparkle },
  { label: "Blog", href: "/blog", icon: Article },
  {
    label: "GitHub",
    href: "https://github.com/damien-schneider/reflet",
    external: true,
    icon: GithubLogo,
  },
] as const;

export default function NavbarMobile() {
  const scrollToSection = (targetId: string) => {
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <motion.nav
      animate={{ y: 0, opacity: 1 }}
      className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-around rounded-full border border-border bg-background/95 px-2 py-3 shadow-lg backdrop-blur-md md:hidden"
      initial={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {NAV_LINKS.map((link) => {
        const Icon = link.icon;
        if ("external" in link && link.external) {
          return (
            <a
              className="flex flex-col items-center gap-1 rounded-full px-4 py-1 font-medium text-muted-foreground text-xs transition-colors hover:text-foreground"
              href={link.href}
              key={link.label}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </a>
          );
        }
        if ("href" in link && !("external" in link)) {
          return (
            <Link
              className="flex flex-col items-center gap-1 rounded-full px-4 py-1 font-medium text-muted-foreground text-xs transition-colors hover:text-foreground"
              href={link.href}
              key={link.label}
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </Link>
          );
        }
        if ("targetId" in link) {
          return (
            <button
              className="flex flex-col items-center gap-1 rounded-full px-4 py-1 font-medium text-muted-foreground text-xs transition-colors hover:text-foreground"
              key={link.label}
              onClick={() => scrollToSection(link.targetId)}
              type="button"
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </button>
          );
        }
        return null;
      })}
      <Link
        className="flex flex-col items-center gap-1 rounded-full px-4 py-1 font-medium text-muted-foreground text-xs transition-colors hover:text-foreground"
        href="/dashboard"
      >
        <User className="h-5 w-5" />
        Log in
      </Link>
    </motion.nav>
  );
}
