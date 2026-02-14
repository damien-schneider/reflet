"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  Buildings,
  CreditCard,
  GithubLogo,
  Megaphone,
  PaintBrush,
  Users,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  description: string;
  icon: Icon;
  href: string;
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const rawOrgSlug = params?.orgSlug;
  const orgSlug = typeof rawOrgSlug === "string" ? rawOrgSlug : "";

  const basePath = `/dashboard/${orgSlug}/settings`;

  const navItems: NavItem[] = [
    {
      title: "General",
      description: "Name, URL, and visibility",
      icon: Buildings,
      href: basePath,
    },
    {
      title: "Branding",
      description: "Logo and colors",
      icon: PaintBrush,
      href: `${basePath}/branding`,
    },
    {
      title: "Members",
      description: "Invite and manage team",
      icon: Users,
      href: `${basePath}/members`,
    },
    {
      title: "GitHub",
      description: "Repository and sync",
      icon: GithubLogo,
      href: `${basePath}/github`,
    },
    {
      title: "Releases",
      description: "Changelog and versioning",
      icon: Megaphone,
      href: `${basePath}/releases`,
    },
    {
      title: "Billing",
      description: "Subscription and payments",
      icon: CreditCard,
      href: `${basePath}/billing`,
    },
  ];

  const isActive = (href: string) => {
    if (href === basePath) {
      return pathname === basePath;
    }
    return pathname?.startsWith(href) ?? false;
  };

  const navContent = navItems.map((item) => {
    const active = isActive(item.href);
    return (
      <Link
        className={cn(
          "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
          active
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
        )}
        href={item.href}
        key={item.title}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <div className="flex flex-col">
          <span className="font-medium">{item.title}</span>
          <span className="hidden text-muted-foreground text-xs md:block">
            {item.description}
          </span>
        </div>
      </Link>
    );
  });

  return (
    <div className="mx-auto max-w-5xl px-4 pt-12 pb-8">
      <div className="flex flex-col md:flex-row md:gap-8">
        {/* Mobile: horizontal scroll nav */}
        <ScrollArea className="-mx-4 mb-6 md:hidden" direction="horizontal">
          <nav className="flex gap-1 px-4">{navContent}</nav>
        </ScrollArea>

        {/* Desktop: sticky vertical nav */}
        <nav className="sticky top-12 hidden w-56 shrink-0 self-start md:flex md:flex-col md:gap-1">
          {navContent}
        </nav>

        {/* Content area */}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
