"use client";

import { CaretDown } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface NavLink {
  label: string;
  href: string;
}

interface NavSubGroup {
  label: string;
  links: NavLink[];
}

interface NavSection {
  title: string;
  links: NavLink[];
  subGroups?: NavSubGroup[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "SDK",
    links: [
      { label: "Overview", href: "/docs/sdk" },
      { label: "Installation", href: "/docs/sdk/installation" },
      { label: "React Hooks", href: "/docs/sdk/react-hooks" },
    ],
  },
  {
    title: "Widgets",
    links: [
      { label: "Overview", href: "/docs/widget" },
      { label: "Feedback Widget", href: "/docs/widget/feedback-widget" },
      { label: "Changelog Widget", href: "/docs/widget/changelog-widget" },
    ],
  },
  {
    title: "Components",
    links: [
      { label: "Overview", href: "/docs/components" },
      { label: "Installation", href: "/docs/components/installation" },
      { label: "Theming", href: "/docs/components/theming" },
    ],
    subGroups: [
      {
        label: "Feedback Cards",
        links: [
          {
            label: "Sweep Corner",
            href: "/docs/components/feedback-cards/sweep-corner",
          },
          {
            label: "Minimal Notch",
            href: "/docs/components/feedback-cards/minimal-notch",
          },
          {
            label: "Editorial Feed",
            href: "/docs/components/feedback-cards/editorial-feed",
          },
        ],
      },
    ],
  },
] as const;

interface DocsSidebarProps {
  pathname: string;
}

function SidebarLink({
  href,
  label,
  isActive,
}: {
  href: string;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      className={cn(
        "block rounded-md px-3 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-accent font-medium text-accent-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
      href={href}
    >
      {label}
    </Link>
  );
}

function SidebarSection({
  section,
  pathname,
}: {
  section: NavSection;
  pathname: string;
}) {
  const sectionHasActiveLink =
    section.links.some((link) => link.href === pathname) ||
    section.subGroups?.some((group) =>
      group.links.some((link) => link.href === pathname)
    );

  const [isOpen, setIsOpen] = useState(sectionHasActiveLink);

  return (
    <div>
      <button
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between px-3 py-2 font-semibold text-foreground text-sm transition-colors hover:text-foreground/80"
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
      >
        {section.title}
        <CaretDown
          className={cn(
            "size-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {isOpen && (
        <nav aria-label={`${section.title} navigation`} className="mt-1">
          <ul className="flex flex-col gap-0.5">
            {section.links.map((link) => (
              <li key={link.href}>
                <SidebarLink
                  href={link.href}
                  isActive={pathname === link.href}
                  label={link.label}
                />
              </li>
            ))}
            {section.subGroups?.map((group) => (
              <li key={group.label}>
                <SidebarSubGroup group={group} pathname={pathname} />
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

function SidebarSubGroup({
  group,
  pathname,
}: {
  group: NavSubGroup;
  pathname: string;
}) {
  const hasActiveLink = group.links.some((link) => link.href === pathname);
  const [isOpen, setIsOpen] = useState(hasActiveLink);

  return (
    <div className="ml-3">
      <button
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between px-3 py-1.5 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
      >
        {group.label}
        <CaretDown
          className={cn(
            "size-3.5 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {isOpen && (
        <ul className="mt-0.5 flex flex-col gap-0.5 border-border border-l pl-2">
          {group.links.map((link) => (
            <li key={link.href}>
              <SidebarLink
                href={link.href}
                isActive={pathname === link.href}
                label={link.label}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DocsSidebar({ pathname }: DocsSidebarProps) {
  return (
    <aside className="flex w-64 shrink-0 flex-col gap-2 py-6 pr-4">
      {NAV_SECTIONS.map((section) => (
        <SidebarSection
          key={section.title}
          pathname={pathname}
          section={section}
        />
      ))}
    </aside>
  );
}

export { DocsSidebar };
