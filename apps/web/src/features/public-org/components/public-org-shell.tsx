"use client";

import { Tabs, TabsList, TabsTab } from "@ctrl-ui/react/ui/tabs";
import {
  ChatCircle,
  FileText,
  Heartbeat,
  type Icon,
  Chat as MessageSquare,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import { env } from "@reflet/env/web";
import { useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Text as TypographyText } from "@/components/ui/typography";
import { PublicViewToolbar } from "@/features/feedback/components/public-view-toolbar";
import { DEFAULT_PRIMARY_COLOR } from "@/lib/branding";
import { generateColorCssVars, generateColorPalette } from "@/lib/color-utils";
import { cn } from "@/lib/utils";

type SectionKey = "feedback" | "changelog" | "status" | "support";

interface NavItem {
  href: string;
  icon: Icon;
  key: SectionKey;
  label: string;
}

function resolveSection(pathname: string, basePath: string): SectionKey {
  const relativePath = basePath ? pathname.replace(basePath, "") : pathname;
  const matches = (segment: string) =>
    relativePath === `/${segment}` || relativePath.startsWith(`/${segment}/`);
  if (matches("changelog")) {
    return "changelog";
  }
  if (matches("support")) {
    return "support";
  }
  if (matches("status")) {
    return "status";
  }
  return "feedback";
}

function MobileNavLink({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  const ItemIcon = item.icon;
  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 font-medium text-caption",
        isActive ? "text-brand-text" : "text-muted-foreground"
      )}
      href={item.href}
    >
      <ItemIcon
        aria-hidden
        className="size-5"
        weight={isActive ? "fill" : "regular"}
      />
      {item.label}
    </Link>
  );
}

interface PublicOrgShellProps {
  basePath: string;
  children: React.ReactNode;
  org: Doc<"organizations">;
  orgSlug: string;
}

export function PublicOrgShell({
  basePath,
  children,
  org,
  orgSlug,
}: PublicOrgShellProps) {
  const pathname = usePathname();

  const supportSettings = useQuery(api.support.settings.get, {
    organizationId: org._id,
  });
  const publicPlanFeatures = useQuery(
    api.billing.queries.getPublicPlanFeatures,
    { organizationId: org._id }
  );
  const statusAggregation = useQuery(api.status.monitors.getAggregateStatus, {
    organizationId: org._id,
  });

  const supportEnabled = supportSettings?.supportEnabled === true;
  const statusEnabled =
    statusAggregation !== undefined &&
    statusAggregation?.status !== "no_monitors";

  const palette = generateColorPalette(
    org.primaryColor ?? DEFAULT_PRIMARY_COLOR
  );
  const colorCssVars = generateColorCssVars(palette);
  const currentSection = resolveSection(pathname, basePath);

  const navItems: NavItem[] = [
    {
      href: basePath || "/",
      icon: MessageSquare,
      key: "feedback",
      label: "Feedback",
    },
    {
      href: `${basePath}/changelog`,
      icon: FileText,
      key: "changelog",
      label: "Changelog",
    },
    ...(statusEnabled
      ? [
          {
            href: `${basePath}/status`,
            icon: Heartbeat,
            key: "status" as const,
            label: "Status",
          },
        ]
      : []),
    ...(supportEnabled
      ? [
          {
            href: `${basePath}/support`,
            icon: ChatCircle,
            key: "support" as const,
            label: "Support",
          },
        ]
      : []),
  ];

  return (
    <div
      className="min-h-screen [--mobile-nav-offset:calc(3.5rem+1px+env(safe-area-inset-bottom))] md:[--mobile-nav-offset:0px]"
      style={colorCssVars}
    >
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-4 bg-background/85 px-4 py-4 backdrop-blur-md">
        <Link
          aria-label={`${org.name} home`}
          className="flex min-w-0 items-center rounded-sm"
          href={basePath || "/"}
        >
          {org.logo ? (
            <Image
              alt={org.name}
              className="h-8 w-auto max-w-30 rounded-sm object-contain outline-1 outline-black/10 -outline-offset-1 dark:outline-white/10"
              height={32}
              src={org.logo}
              width={120}
            />
          ) : (
            <span className="truncate font-medium text-heading-4">
              {org.name}
            </span>
          )}
        </Link>

        <nav aria-label={`${org.name} sections`} className="hidden md:block">
          <Tabs value={currentSection}>
            <TabsList>
              {navItems.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <TabsTab
                    aria-current={
                      currentSection === item.key ? "page" : undefined
                    }
                    key={item.key}
                    nativeButton={false}
                    render={<Link href={item.href} />}
                    value={item.key}
                  >
                    <ItemIcon aria-hidden className="size-4" />
                    {item.label}
                  </TabsTab>
                );
              })}
            </TabsList>
          </Tabs>
        </nav>
      </header>

      <main className="min-h-[80vh] pt-22 pb-(--mobile-nav-offset)">
        {children}
      </main>

      <nav
        aria-label={`${org.name} sections`}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="flex items-stretch justify-around">
          {navItems.map((item) => (
            <MobileNavLink
              isActive={currentSection === item.key}
              item={item}
              key={item.key}
            />
          ))}
        </div>
      </nav>

      {publicPlanFeatures?.hideBranding === false && (
        <footer className="py-8">
          <div className="container mx-auto flex items-center justify-center px-4 text-muted-foreground">
            <TypographyText variant="bodySmall">
              Powered by{" "}
              <Link
                className="font-display font-medium text-brand-text text-lg underline underline-offset-4 hover:text-brand-text/80"
                href={env.NEXT_PUBLIC_SITE_URL ?? "https://www.reflet.app"}
                rel="noopener"
                target="_blank"
              >
                Reflet
              </Link>
            </TypographyText>
          </div>
        </footer>
      )}

      <PublicViewToolbar orgSlug={orgSlug} />
    </div>
  );
}
