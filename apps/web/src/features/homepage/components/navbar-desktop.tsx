"use client";

import { GithubLogo } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  NavigationList,
  NavigationListContent,
  NavigationListItem,
  NavigationListLink,
  NavigationListList,
  NavigationListTrigger,
  navigationListTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

const REFLET_BASE_URL = "https://www.reflet.app/reflet";

interface ProductItem {
  description: string;
  external?: boolean;
  href: string;
  label: string;
}

const PRODUCT_ITEMS: ProductItem[] = [
  {
    label: "Autopilot Dashboard",
    description: "See your AI agents at work",
    href: "/autopilot",
  },
  {
    label: "Feedback Board",
    description: "Collect and organize user feedback with voting",
    href: REFLET_BASE_URL,
    external: true,
  },
  {
    label: "Roadmap",
    description: "Kanban-style board to plan and track progress",
    href: `${REFLET_BASE_URL}?view=roadmap`,
    external: true,
  },
  {
    label: "Changelog",
    description: "Beautiful release notes linked to features",
    href: `${REFLET_BASE_URL}/changelog`,
    external: true,
  },
];

interface ResourceItem {
  description: string;
  external?: boolean;
  href: string;
  label: string;
}

const RESOURCE_ITEMS: ResourceItem[] = [
  {
    label: "How Autopilot Works",
    description: "Learn how 7 AI agents run your product",
    href: "/autopilot",
  },
  {
    label: "Documentation",
    description: "Guides, SDK reference and API docs",
    href: "/docs",
  },
  {
    label: "Blog",
    description: "Product updates, tips and insights",
    href: "/blog",
  },
];

export default function NavbarDesktop() {
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(function trackScrollPosition() {
    const handleScroll = () => setHasScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 hidden border-border border-b transition-[height,background-color,box-shadow] duration-300 md:block",
        hasScrolled
          ? "bg-background/95 shadow-sm backdrop-blur-lg"
          : "bg-background/80 backdrop-blur-md"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "flex items-center justify-between transition-[height] duration-300",
            hasScrolled ? "h-16" : "h-20"
          )}
        >
          <div className="flex items-center gap-2">
            {/* Logo */}
            <div className="flex flex-shrink-0 items-center">
              <Link
                className="font-serif text-2xl text-foreground tracking-tight transition-opacity hover:opacity-70"
                href="/"
              >
                Reflet.
              </Link>
            </div>

            {/* Navigation Menu */}
            <div className="ml-2">
              <NavigationList>
                <NavigationListList>
                  <NavigationListItem>
                    <NavigationListLink
                      className={navigationListTriggerStyle()}
                      href="/autopilot"
                    >
                      Autopilot
                    </NavigationListLink>
                  </NavigationListItem>

                  <NavigationListItem>
                    <NavigationListLink
                      className={navigationListTriggerStyle()}
                      href="/pricing"
                    >
                      Pricing
                    </NavigationListLink>
                  </NavigationListItem>

                  <NavigationListItem>
                    <NavigationListTrigger>Product</NavigationListTrigger>
                    <NavigationListContent className="w-[300px]">
                      <ul className="grid gap-1 p-1">
                        {PRODUCT_ITEMS.map((item) => (
                          <li key={item.label}>
                            <NavigationListLink
                              href={item.href}
                              {...(item.external
                                ? {
                                    rel: "noopener noreferrer",
                                    target: "_blank",
                                  }
                                : {})}
                            >
                              <div>
                                <div className="font-medium text-sm leading-none">
                                  {item.label}
                                </div>
                                <p className="mt-1 text-muted-foreground text-xs leading-snug">
                                  {item.description}
                                </p>
                              </div>
                            </NavigationListLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationListContent>
                  </NavigationListItem>

                  <NavigationListItem>
                    <NavigationListTrigger>Resources</NavigationListTrigger>
                    <NavigationListContent className="w-[280px]">
                      <ul className="grid gap-1 p-1">
                        {RESOURCE_ITEMS.map((item) => (
                          <li key={item.label}>
                            <NavigationListLink href={item.href}>
                              <div>
                                <div className="font-medium text-sm leading-none">
                                  {item.label}
                                </div>
                                <p className="mt-1 text-muted-foreground text-xs leading-snug">
                                  {item.description}
                                </p>
                              </div>
                            </NavigationListLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationListContent>
                  </NavigationListItem>
                </NavigationListList>
              </NavigationList>
            </div>
          </div>

          {/* Desktop Right Actions */}
          <div className="flex items-center gap-4">
            <a
              aria-label="GitHub repository"
              className="inline-flex items-center text-foreground transition-colors hover:text-muted-foreground"
              href="https://github.com/damien-schneider/reflet"
              rel="noopener noreferrer"
              target="_blank"
            >
              <GithubLogo className="h-5 w-5" />
            </a>

            <Link
              className="font-medium text-foreground text-sm transition-colors hover:text-muted-foreground"
              href="/dashboard"
              prefetch={true}
            >
              Log in
            </Link>
            <Link href="/dashboard" prefetch={true}>
              <Button
                className="transition-all duration-200 hover:scale-105 hover:shadow-md"
                size="default"
                variant="default"
              >
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
