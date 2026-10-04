"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import Link from "next/link";
import { useId } from "react";

interface NavLink {
  href: string;
  label: string;
}

interface NavGroup {
  label: string;
  links: readonly NavLink[];
}

interface NavSection {
  groups?: readonly NavGroup[];
  links: readonly NavLink[];
  title: string;
}

const NAV_SECTIONS: readonly NavSection[] = [
  {
    links: [{ href: "/docs", label: "Introduction" }],
    title: "Getting started",
  },
  {
    links: [
      { href: "/docs/sdk", label: "Overview" },
      { href: "/docs/sdk/installation", label: "Installation" },
      { href: "/docs/sdk/react-hooks", label: "React hooks" },
      { href: "/docs/sdk/surveys", label: "Surveys" },
    ],
    title: "SDK",
  },
  {
    links: [
      { href: "/docs/widget", label: "Overview" },
      {
        href: "/docs/widget/floating-feedback",
        label: "Floating feedback button",
      },
      { href: "/docs/widget/feedback-widget", label: "Feedback widget" },
      { href: "/docs/widget/changelog-widget", label: "Changelog widget" },
    ],
    title: "Widgets",
  },
  {
    groups: [
      {
        label: "Feedback cards",
        links: [
          {
            href: "/docs/components/feedback-cards/sweep-corner",
            label: "Sweep Corner",
          },
          {
            href: "/docs/components/feedback-cards/minimal-notch",
            label: "Minimal Notch",
          },
          {
            href: "/docs/components/feedback-cards/editorial-feed",
            label: "Editorial Feed",
          },
        ],
      },
      {
        label: "Milestone views",
        links: [
          {
            href: "/docs/components/milestone-views",
            label: "Overview",
          },
          {
            href: "/docs/components/milestone-views/track",
            label: "Horizontal Track",
          },
          {
            href: "/docs/components/milestone-views/editorial-accordion",
            label: "Editorial Accordion",
          },
          {
            href: "/docs/components/milestone-views/dashboard-timeline",
            label: "Dashboard Timeline",
          },
        ],
      },
    ],
    links: [
      { href: "/docs/components", label: "Overview" },
      { href: "/docs/components/installation", label: "Installation" },
      { href: "/docs/components/theming", label: "Theming" },
    ],
    title: "Components",
  },
  {
    links: [
      { href: "/docs/api", label: "REST API" },
      { href: "/docs/cli", label: "CLI for agents" },
    ],
    title: "Reference",
  },
];

interface SidebarLinkListProps {
  className?: string;
  labelledBy: string;
  links: readonly NavLink[];
  onNavigate?: () => void;
  pathname: string;
}

function SidebarLinkList({
  className,
  labelledBy,
  links,
  onNavigate,
  pathname,
}: SidebarLinkListProps) {
  return (
    <ul aria-labelledby={labelledBy} className={cn("flex flex-col", className)}>
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <li key={link.href}>
            <Link
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "block rounded-md px-3 py-1.5 text-body",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
              href={link.href}
              onClick={onNavigate}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const slug = (label: string) => label.toLowerCase().replaceAll(" ", "-");

interface DocsSidebarProps {
  /** Called after a link is chosen, e.g. to close the mobile sheet. */
  onNavigate?: () => void;
  pathname: string;
}

function DocsSidebar({ pathname, onNavigate }: DocsSidebarProps) {
  const idPrefix = useId();
  const toId = (label: string) => `${idPrefix}-${slug(label)}`;

  return (
    <nav aria-label="Documentation" className="flex flex-col gap-6">
      {NAV_SECTIONS.map((section) => (
        <div className="flex flex-col gap-1" key={section.title}>
          <p
            className="px-3 font-medium text-caption text-foreground"
            id={toId(section.title)}
          >
            {section.title}
          </p>
          <SidebarLinkList
            labelledBy={toId(section.title)}
            links={section.links}
            onNavigate={onNavigate}
            pathname={pathname}
          />
          {section.groups?.map((group) => (
            <div className="mt-2 flex flex-col gap-1" key={group.label}>
              <p
                className="px-3 text-caption text-muted-foreground"
                id={toId(group.label)}
              >
                {group.label}
              </p>
              <SidebarLinkList
                className="ml-3 border-border border-l pl-2"
                labelledBy={toId(group.label)}
                links={group.links}
                onNavigate={onNavigate}
                pathname={pathname}
              />
            </div>
          ))}
        </div>
      ))}
    </nav>
  );
}

export { DocsSidebar };
