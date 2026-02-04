"use client";

import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { type ReactNode, useId } from "react";

import { cn } from "@/lib/utils";

interface MobileNavProps {
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}

function MobileNav({ className, style, children }: MobileNavProps) {
  const layoutId = useId();
  return (
    <LayoutGroup id={layoutId}>
      <nav
        className={cn(
          "flex items-center gap-1 rounded-full bg-muted p-1 text-muted-foreground",
          className
        )}
        style={style}
      >
        {children}
      </nav>
    </LayoutGroup>
  );
}

interface MobileNavLinkProps {
  href: string;
  isActive: boolean;
  children: ReactNode;
  className?: string;
  prefetch?: boolean;
}

function MobileNavIndicator() {
  return (
    <motion.span
      className="absolute inset-0 rounded-full bg-background shadow-sm"
      layoutId="mobile-nav-indicator"
      transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
    />
  );
}

function MobileNavLink({
  href,
  isActive,
  children,
  className,
  prefetch = true,
}: MobileNavLinkProps) {
  return (
    <Link
      className={cn(
        "relative flex h-full w-full flex-1 cursor-pointer flex-col items-center justify-center gap-1 whitespace-nowrap rounded-full px-4 py-1 font-medium text-xs transition-colors",
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
        className
      )}
      href={href}
      prefetch={prefetch}
    >
      {isActive && <MobileNavIndicator />}
      <span className="relative z-10 inline-flex flex-col items-center gap-1">
        {children}
      </span>
    </Link>
  );
}

export { MobileNav, MobileNavLink };
