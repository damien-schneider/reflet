"use client";

import {
  Article,
  CurrencyCircleDollar,
  GithubLogo,
  List,
  MapTrifold,
  Sparkle,
  User,
  X,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import Link from "next/link";
import { type ComponentType, useState } from "react";

type IconComponent = ComponentType<{ className?: string }>;

type NavLink =
  | { label: string; targetId: string; icon: IconComponent }
  | {
      label: string;
      href: string;
      external: true;
      icon: IconComponent;
    }
  | { label: string; href: string; icon: IconComponent };

const PRIMARY_LINKS: NavLink[] = [
  { label: "Pricing", targetId: "pricing", icon: CurrencyCircleDollar },
  { label: "Features", targetId: "features", icon: Sparkle },
];

const SECONDARY_LINKS: NavLink[] = [
  {
    label: "Roadmap",
    href: "https://www.reflet.app/reflet?view=roadmap",
    external: true,
    icon: MapTrifold,
  },
  { label: "Blog", href: "/blog", icon: Article },
  {
    label: "GitHub",
    href: "https://github.com/damien-schneider/reflet",
    external: true,
    icon: GithubLogo,
  },
];

const linkClassName =
  "flex flex-col items-center gap-1 whitespace-nowrap rounded-full px-4 py-1 font-medium text-muted-foreground text-xs transition-colors hover:text-foreground";

function NavLinkItem({
  link,
  onNavigate,
}: {
  link: NavLink;
  onNavigate?: () => void;
}) {
  const Icon = link.icon;

  if ("external" in link && link.external) {
    return (
      <a
        className={linkClassName}
        href={link.href}
        rel="noopener noreferrer"
        target="_blank"
      >
        <Icon className="h-5 w-5" />
        {link.label}
      </a>
    );
  }

  if ("href" in link) {
    return (
      <Link className={linkClassName} href={link.href} onClick={onNavigate}>
        <Icon className="h-5 w-5" />
        {link.label}
      </Link>
    );
  }

  if ("targetId" in link) {
    const scrollToSection = () => {
      const element = document.getElementById(link.targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
      onNavigate?.();
    };

    return (
      <button className={linkClassName} onClick={scrollToSection} type="button">
        <Icon className="h-5 w-5" />
        {link.label}
      </button>
    );
  }

  return null;
}

export default function NavbarMobile() {
  const [isExpanded, setIsExpanded] = useState(false);

  const collapse = () => setIsExpanded(false);

  return (
    <motion.nav
      animate={{ y: 0, opacity: 1 }}
      className="fixed inset-x-4 bottom-4 z-50 overflow-hidden rounded-3xl border border-border bg-background/95 shadow-lg backdrop-blur-md md:hidden"
      initial={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        animate={{ height: isExpanded ? 60 : 0 }}
        className="overflow-hidden"
        initial={false}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex h-13 items-center justify-around px-2 pt-2">
          {SECONDARY_LINKS.map((link) => (
            <NavLinkItem key={link.label} link={link} onNavigate={collapse} />
          ))}
        </div>
      </motion.div>

      <div className="flex items-center justify-around px-2 py-3">
        {PRIMARY_LINKS.map((link) => (
          <NavLinkItem key={link.label} link={link} onNavigate={collapse} />
        ))}

        <Link className={linkClassName} href="/dashboard" onClick={collapse}>
          <User className="h-5 w-5" />
          Log in
        </Link>

        <button
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Close menu" : "Open menu"}
          className={linkClassName}
          onClick={() => setIsExpanded((prev) => !prev)}
          type="button"
        >
          {isExpanded ? (
            <X className="h-5 w-5" />
          ) : (
            <List className="h-5 w-5" />
          )}
          More
        </button>
      </div>
    </motion.nav>
  );
}
