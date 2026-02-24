"use client";

import { GithubLogo } from "@phosphor-icons/react";
import {
  domAnimation,
  LazyMotion,
  m,
  useMotionValueEvent,
  useScroll,
} from "motion/react";
import Link from "next/link";
import { useState } from "react";

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

interface DemoItem {
  label: string;
  description: string;
  href: string;
}

const DEMO_ITEMS: DemoItem[] = [
  {
    label: "Feedback Board",
    description: "Collect and organize user feedback with voting",
    href: REFLET_BASE_URL,
  },
  {
    label: "Roadmap",
    description: "Kanban-style board to plan and track progress",
    href: `${REFLET_BASE_URL}?view=roadmap`,
  },
  {
    label: "Milestones",
    description: "Track feature milestones and release goals",
    href: `${REFLET_BASE_URL}?view=milestones`,
  },
  {
    label: "Changelog",
    description: "Beautiful release notes linked to features",
    href: `${REFLET_BASE_URL}/changelog`,
  },
  {
    label: "Support",
    description: "Help center with real-time conversations",
    href: `${REFLET_BASE_URL}/support`,
  },
];

interface ResourceItem {
  label: string;
  description: string;
  href: string;
  external?: boolean;
}

const RESOURCE_ITEMS: ResourceItem[] = [
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
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setHasScrolled(latest > 50);
  });

  return (
    <LazyMotion features={domAnimation}>
      <m.nav
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
            <div className="flex items-center gap-2">
              {/* Logo */}
              <m.div
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
              </m.div>

              {/* Navigation Menu */}
              <m.div
                animate={{ opacity: 1, y: 0 }}
                className="ml-2"
                initial={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                <NavigationList>
                  <NavigationListList>
                    <NavigationListItem>
                      <NavigationListLink
                        className={navigationListTriggerStyle()}
                        href="/#pricing"
                      >
                        Pricing
                      </NavigationListLink>
                    </NavigationListItem>

                    <NavigationListItem>
                      <NavigationListLink
                        className={navigationListTriggerStyle()}
                        href="/#features"
                      >
                        Features
                      </NavigationListLink>
                    </NavigationListItem>

                    <NavigationListItem>
                      <NavigationListTrigger>Demo</NavigationListTrigger>
                      <NavigationListContent className="w-[300px]">
                        <ul className="grid gap-1 p-1">
                          {DEMO_ITEMS.map((item) => (
                            <li key={item.label}>
                              <NavigationListLink
                                href={item.href}
                                rel="noopener noreferrer"
                                target="_blank"
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
              </m.div>
            </div>

            {/* Desktop Right Actions */}
            <div className="flex items-center gap-4">
              <m.a
                animate={{ opacity: 1, y: 0 }}
                aria-label="GitHub repository"
                className="inline-flex items-center text-foreground transition-colors hover:text-muted-foreground"
                href="https://github.com/damien-schneider/reflet"
                initial={{ opacity: 0, y: -20 }}
                rel="noopener noreferrer"
                target="_blank"
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <GithubLogo className="h-5 w-5" />
              </m.a>

              <m.div
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
              </m.div>
              <m.div
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
              </m.div>
            </div>
          </div>
        </div>
      </m.nav>
    </LazyMotion>
  );
}
