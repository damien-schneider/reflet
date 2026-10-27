"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import Link from "next/link";
import { useId } from "react";
import { DOCS_NAVIGATION, type NavLink } from "./navigation";

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
  onNavigate?: () => void;
  pathname: string;
}

function DocsSidebar({ pathname, onNavigate }: DocsSidebarProps) {
  const idPrefix = useId();
  const toId = (label: string) => `${idPrefix}-${slug(label)}`;

  return (
    <nav aria-label="Documentation" className="flex flex-col gap-6">
      {DOCS_NAVIGATION.map((section) => (
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
